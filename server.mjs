import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { scryptSync, randomBytes, timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { modules, defaultSettings, roles, roleModules, totals } from './crm-model.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const dataDir = resolve(process.env.APP_DATA_DIR || join(root, 'local-data'));
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(join(dataDir, 'gestao.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, permissions TEXT);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, userId TEXT NOT NULL, expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, entity TEXT NOT NULL, data TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS records_entity ON records(entity);
 CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, userId TEXT, userName TEXT, action TEXT, entity TEXT, recordId TEXT, detail TEXT);
 CREATE TABLE IF NOT EXISTS revisions(id INTEGER PRIMARY KEY AUTOINCREMENT, recordId TEXT NOT NULL, version INTEGER NOT NULL, data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS attachments(id TEXT PRIMARY KEY, recordId TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, content BLOB NOT NULL, date TEXT NOT NULL);
`);
if (!db.prepare('SELECT id FROM settings').get()) db.prepare('INSERT INTO settings VALUES(1,?)').run(JSON.stringify({ ...defaultSettings, captureKey: randomBytes(24).toString('hex') }));
const settings = () => JSON.parse(db.prepare('SELECT data FROM settings WHERE id=1').get().data);
const list = entity => db.prepare('SELECT data FROM records WHERE entity=? ORDER BY rowid DESC').all(entity).map(r => JSON.parse(r.data));
const find = (entity, id) => { const row = db.prepare('SELECT data FROM records WHERE entity=? AND id=?').get(entity, id); if (!row) fail(404, 'Registro não encontrado.'); return JSON.parse(row.data); };
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: !!u.active, permissions: u.permissions ? JSON.parse(u.permissions) : null });
const allUsers = () => db.prepare('SELECT * FROM users ORDER BY name').all().map(publicUser);
const allowed = u => u.permissions ? JSON.parse(u.permissions) : roleModules[u.role] || [];
const can = (u, entity) => u && (u.role === 'Administrador' || allowed(u).includes(entity));
const requireModule = (u, entity) => { if (!modules[entity]) fail(404, 'Módulo não encontrado.'); if (!can(u, entity)) fail(403, 'Seu perfil não tem acesso a este módulo.'); };
function fail(status, message) { const err = new Error(message); err.status = status; throw err; }
function admin(u) { if (u.role !== 'Administrador') fail(403, 'Ação exclusiva do administrador.'); }
function audit(u, action, entity = '', recordId = '', detail = '') { db.prepare('INSERT INTO audit(date,userId,userName,action,entity,recordId,detail) VALUES(?,?,?,?,?,?,?)').run(new Date().toISOString(), u?.id || '', u?.name || 'Formulário externo', action, entity, recordId, detail); }
function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const value = fn(); db.exec('COMMIT'); return value; } catch (e) { db.exec('ROLLBACK'); throw e; } }
function hash(password) { const salt = randomBytes(16).toString('hex'); return salt + ':' + scryptSync(password, salt, 64).toString('hex'); }
function passwordValid(password, encoded) { const [salt, value] = encoded.split(':'); return timingSafeEqual(scryptSync(String(password || ''), salt, 64), Buffer.from(value, 'hex')); }
const tokenHash = t => createHash('sha256').update(t).digest('hex');
function setSession(res, u) { const token = randomBytes(32).toString('hex'); db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now()); db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(tokenHash(token), u.id, Date.now() + 12 * 3600000); res.setHeader('Set-Cookie', `gestao_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`); }
function session(req) { const token = /(?:^|;\s*)gestao_session=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1]; if (!token) return null; return db.prepare('SELECT users.* FROM users JOIN sessions ON users.id=sessions.userId WHERE sessions.token=? AND sessions.expires>? AND users.active=1').get(tokenHash(token), Date.now()); }
async function body(req) { let size = 0; const chunks = []; for await (const chunk of req) { size += chunk.length; if (size > 8 * 1024 * 1024) fail(413, 'Limite de 8 MB por requisição.'); chunks.push(chunk); } try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { fail(400, 'JSON inválido.'); } }
function json(res, data, status = 200) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
const limits = new Map();
function rateLimit(req, group, max) { const key = group + req.socket.remoteAddress; const now = Date.now(); let state = limits.get(key); if (!state || state.until < now) { state = { count: 0, until: now + 60000 }; limits.set(key, state); } if (++state.count > max) fail(429, 'Muitas tentativas. Aguarde um minuto.'); }
function clean(entity, input, previous = null) {
 const schema = modules[entity]; const result = {};
 for (const field of schema.fields) {
  let value = input[field.key] ?? previous?.[field.key] ?? '';
  if (typeof value !== 'string' && typeof value !== 'number') fail(400, `${field.label}: valor inválido.`);
  if (typeof value === 'string') value = value.trim();
  if (field.required && value === '') fail(400, `${field.label} é obrigatório.`);
  if (field.type === 'number' && value !== '') { value = Number(value); if (!Number.isFinite(value) || value < (field.min ?? 0) || value > (field.max ?? 1e12)) fail(400, `${field.label}: número fora do intervalo.`); }
  if (String(value).length > (field.type === 'textarea' ? 20000 : 500)) fail(400, `${field.label}: texto muito longo.`);
  if (field.options && value && !field.options.includes(value)) fail(400, `${field.label}: opção inválida.`);
  if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail(400, 'E-mail inválido.');
  if (field.type === 'url' && value && !/^https?:\/\//i.test(value)) fail(400, 'O site deve começar com https:// ou http://.');
  if (['date', 'datetime-local', 'month'].includes(field.type) && value && (Number.isNaN(Date.parse(value)) || !/^\d{4}-\d{2}/.test(value))) fail(400, `${field.label}: data inválida.`);
  if (field.type === 'relation' && value) find(field.entity, value);
  if (field.type === 'user' && value && !db.prepare('SELECT id FROM users WHERE id=? AND active=1').get(value)) fail(400, 'Responsável inválido ou inativo.');
  result[field.key] = value;
 }
 if (entity === 'opportunities') { const stage = settings().stages.find(s => s.id === result.stage); if (!stage) fail(400, 'Etapa inválida.'); if (result.stage === 'lost' && !result.lostReason) fail(400, 'Informe o motivo da perda.'); if (['won', 'lost'].includes(result.stage)) result.probability = stage.probability; if (previous?.stage !== result.stage && ['won', 'lost'].includes(result.stage)) result.closedAt = new Date().toISOString(); else result.closedAt = ['won', 'lost'].includes(result.stage) ? previous?.closedAt : ''; }
 if (entity === 'events' && result.end <= result.start) fail(400, 'O fim deve ser posterior ao início.');
 if (entity === 'contracts' && result.startDate && result.endDate && result.endDate < result.startDate) fail(400, 'O fim do contrato deve ser posterior ao início.');
 if (entity === 'receivables' && result.status === 'Pago' && !result.paidDate) fail(400, 'Informe a data do pagamento.');
 if (entity === 'movements') { if (!result.productId) fail(400, 'Selecione o produto.'); if (find('products', result.productId).type !== 'Produto') fail(400, 'Serviços não movimentam estoque.'); const balance = list('movements').filter(r => r.productId === result.productId && r.id !== previous?.id).reduce((n,r) => n + (r.type === 'Entrada' ? 1 : -1) * r.quantity, 0); if (balance + (result.type === 'Entrada' ? 1 : -1) * result.quantity < -0.000001) fail(400, 'Saldo insuficiente em estoque.'); }
 if (schema.lines) {
  const lines = input.items ?? previous?.items ?? [];
  if (!Array.isArray(lines) || !lines.length || lines.length > 100) fail(400, 'Inclua de 1 a 100 itens.');
  result.items = lines.map(i => { const quantity = Number(i.quantity); const price = Number(i.price); if (!String(i.description || '').trim() || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1e8 || !Number.isFinite(price) || price < 0 || price > 1e10) fail(400, 'Descrição, quantidade e preço dos itens são obrigatórios e devem ser válidos.'); if (i.productId) find('products', i.productId); return { productId: i.productId || '', description: String(i.description).slice(0, 500), quantity, price }; });
  try { Object.assign(result, totals(result.items, result.discount)); } catch (e) { fail(400, e.message); }
 }
 return result;
}
function save(entity, input, u, id = null, automate = true) {
 const prev = id ? find(entity, id) : null;
 if(prev&&entity==='movements'&&['orders','purchases'].some(type=>list(type).some(r=>r.generatedMovementIds?.includes(id))))fail(409,'Movimentação vinculada a documento. Registre uma nova movimentação de ajuste.');
 if (prev && Number(input.version) !== prev.version) fail(409, 'Este registro foi alterado. Atualize a tela antes de salvar.');
 const row = { ...clean(entity, input, prev), id: id || randomUUID(), createdAt: prev?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), version: (prev?.version || 0) + 1 };
 if (prev?.generatedMovementIds?.length && (JSON.stringify(row.items)!==JSON.stringify(prev.items)||row.status!==prev.status)) fail(409,'Documento já movimentou estoque. Registre ajustes no estoque antes de alterar a operação.');
 if ((prev?.generatedReceivableId||prev?.generatedPurchasePaymentId) && row.amount!==prev.amount) fail(409,'Documento já gerou financeiro. Revise o lançamento financeiro vinculado antes de alterar o valor.');
 if(entity==='movements'&&prev&&prev.productId!==row.productId){const oldBalance=list('movements').filter(r=>r.productId===prev.productId&&r.id!==prev.id).reduce((n,r)=>n+(r.type==='Entrada'?1:-1)*r.quantity,0);if(oldBalance<0)fail(409,'A mudança deixaria o produto original com estoque negativo.');}
 if (!prev && entity === 'leads' && !row.owner && settings().autoAssign) { const sellers = allUsers().filter(u => u.active && ['Vendedor', 'Gestor', 'Administrador'].includes(u.role)); if (sellers.length) row.owner = sellers[list('leads').length % sellers.length].id; }
 for (const key of ['convertedClientId', 'convertedOpportunityId', 'generatedOrderId', 'generatedReceivableId', 'generatedPurchasePaymentId','generatedMovementIds']) if (prev?.[key]) row[key] = prev[key];
 db.prepare('INSERT INTO records(id,entity,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(row.id, entity, JSON.stringify(row));
 if (entity === 'proposals') db.prepare('INSERT INTO revisions(recordId,version,data) VALUES(?,?,?)').run(row.id, row.version, JSON.stringify(row));
 audit(u, prev ? 'Atualizou' : 'Criou', entity, row.id, row.name);
 const trigger = !prev && entity === 'leads' ? 'Lead criado' : !prev && entity === 'opportunities' ? 'Oportunidade criada' : entity === 'opportunities' && row.stage === 'won' && prev?.stage !== 'won' ? 'Oportunidade ganha' : !prev && entity === 'tickets' ? 'Chamado aberto' : null;
 if (automate && trigger) for (const rule of list('automations').filter(r => r.status === 'Ativa' && r.trigger === trigger)) { const due = new Date(); due.setDate(due.getDate() + Number(rule.days)); save('tasks', { name: rule.taskTitle + ' — ' + row.name, owner: rule.owner || row.owner, dueDate: new Date(due.getTime()-due.getTimezoneOffset()*60000).toISOString().slice(0,16), status: 'Pendente', priority: 'Normal', clientId: row.clientId || '', leadId: entity === 'leads' ? row.id : row.leadId || '', notes: `Criada pela automação: ${rule.name}` }, u, null, false); }
 return row;
}
function remove(entity, id, u) {
 const row = find(entity, id);
 const generatedLinks=['convertedClientId','convertedOpportunityId','generatedOrderId','generatedReceivableId','generatedPurchasePaymentId'];
 for(const type of Object.keys(modules))if(list(type).some(r=>generatedLinks.some(key=>r[key]===id)))fail(409,'Registro gerado por outro documento. Preserve o vínculo e use o status para encerrar a operação.');
 if(row.generatedMovementIds?.length)fail(409,'Documento com movimentação de estoque não pode ser excluído.');
 if(entity==='movements'&&['orders','purchases'].some(type=>list(type).some(r=>r.generatedMovementIds?.includes(id))))fail(409,'Movimentação gerada por pedido ou compra. Registre uma movimentação de ajuste para corrigir o saldo.');
 for (const [type, schema] of Object.entries(modules)) for (const field of schema.fields.filter(f => f.type === 'relation' && f.entity === entity)) if (list(type).some(r => r[field.key] === id)) fail(409, `Registro vinculado a ${schema.title}. Remova ou altere o vínculo primeiro.`);
 if (entity === 'products' && ['proposals', 'orders', 'purchases'].some(type => list(type).some(r => r.items.some(i => i.productId === id)))) fail(409, 'Produto vinculado a itens de documentos.');
 if (entity === 'movements' && row.type === 'Entrada') { const balance = list(entity).filter(r => r.productId === row.productId && r.id !== id).reduce((n,r) => n + (r.type === 'Entrada' ? 1 : -1) * r.quantity, 0); if (balance < 0) fail(409, 'A exclusão deixaria o estoque negativo.'); }
 db.prepare('DELETE FROM attachments WHERE recordId=?').run(id); db.prepare('DELETE FROM revisions WHERE recordId=?').run(id); db.prepare('DELETE FROM records WHERE id=?').run(id); audit(u, 'Excluiu', entity, id, row.name);
}
function putRaw(entity, row) { db.prepare('UPDATE records SET data=? WHERE id=? AND entity=?').run(JSON.stringify(row), row.id, entity); }
function convert(entity, id, action, u) {
 const row = find(entity,id);
 if(['orders','purchases'].includes(entity)&&action==='stock'){
  requireModule(u,'movements');requireModule(u,'products');if(row.generatedMovementIds?.length)fail(409,'Estoque já movimentado.');if(['Cancelado','Cancelada'].includes(row.status))fail(400,'Documento cancelado.');
  const items=row.items.filter(i=>i.productId&&find('products',i.productId).type==='Produto');
  if(!items.length)fail(400,'Nenhum produto físico vinculado aos itens deste documento.');
  const moves=items.map(i=>save('movements',{name:`${entity==='orders'?'Entrega':'Recebimento'} — ${row.name}`,productId:i.productId,type:entity==='orders'?'Saída':'Entrada',quantity:i.quantity,date:new Date().toLocaleDateString('en-CA'),notes:`Documento de origem: ${id}`},u));
  row.generatedMovementIds=moves.map(m=>m.id);row.status=entity==='orders'?'Concluído':'Recebida';row.version++;row.updatedAt=new Date().toISOString();putRaw(entity,row);audit(u,entity==='orders'?'Entregou pedido':'Recebeu compra',entity,id,row.name);return row;
 }
 if (entity === 'leads' && action === 'convert') {
  requireModule(u,'clients'); requireModule(u,'opportunities');
  if (row.convertedClientId || row.status === 'Convertido') fail(409,'Lead já convertido.');
  const client = save('clients',{name:row.name,email:row.email,phone:row.phone,companyId:row.companyId,tags:row.tags,owner:row.owner,personType:'Pessoa física',status:'Ativo',notes:row.notes},u);
  const opportunity = save('opportunities',{name:`Negociação — ${row.name}`,clientId:client.id,leadId:id,owner:row.owner,stage:settings().stages[0].id,probability:settings().stages[0].probability,amount:0},u);
  const updated = save(entity,{...row,status:'Convertido'},u,id); updated.convertedClientId=client.id; updated.convertedOpportunityId=opportunity.id; putRaw(entity,updated); return {client,opportunity};
 }
 if (entity === 'proposals' && action === 'order') {
  requireModule(u,'orders'); if (row.status !== 'Aprovada') fail(400,'Aprove a proposta antes de gerar o pedido.'); if (row.generatedOrderId) fail(409,'Esta proposta já gerou um pedido.');
  const order = save('orders',{name:row.name,clientId:row.clientId,proposalId:id,owner:row.owner,items:row.items,discount:row.discount,status:'Confirmado'},u); row.generatedOrderId=order.id; row.version++; putRaw(entity,row); return order;
 }
 if (['orders','purchases'].includes(entity) && action === 'finance') {
  requireModule(u,'receivables'); const key = entity === 'orders' ? 'generatedReceivableId' : 'generatedPurchasePaymentId'; if (row[key]) fail(409,'Lançamento financeiro já gerado.'); if (row.status === 'Cancelado' || row.status === 'Cancelada') fail(400,'Documento cancelado.');
  const entry=save('receivables',{name:row.name,clientId:row.clientId || '',orderId:entity==='orders'?id:'',owner:row.owner,type:entity==='orders'?'Receita':'Despesa',amount:row.amount,dueDate:new Date().toISOString().slice(0,10),status:'Pendente',notes:entity==='purchases'?`Compra ${id}`:''},u); row[key]=entry.id; row.version++; putRaw(entity,row); return entry;
 }
 fail(404,'Ação não disponível.');
}

const port = Number(process.env.PORT || 5174);
let vite;
if (process.env.NODE_ENV !== 'production' && !process.argv.includes('--production')) {
 const { createServer: createViteServer } = await import('vite');
 vite = await createViteServer({ root, configFile:false, server:{ middlewareMode:true, hmr:false, fs:{ deny:['.env','.env.*','**/.git/**','**/local-data/**','**/server.mjs','**/tests/**','**/*.sqlite*'] } }, appType:'spa' });
}
const http = createServer(async(req,res) => {
 res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','same-origin'); res.setHeader('X-Frame-Options','DENY');
 try {
  const host=req.headers.host || ''; if (![`127.0.0.1:${port}`,`localhost:${port}`].includes(host)) fail(403,'Host não autorizado.');
  const url=new URL(req.url,`http://${host}`); const path=url.pathname;
  if (!path.startsWith('/api/')) {
   if (path.match(/(?:^|\/)(?:local-data|tests|\.git|\.env|server\.mjs)(?:\/|\.|$)/)) fail(404,'Não encontrado.');
   if(vite) return vite.middlewares(req,res,()=>json(res,{error:'Não encontrado.'},404));
   const target=resolve(root,'dist','.'+(path==='/'?'/index.html':decodeURIComponent(path)));
   if(!target.startsWith(join(root,'dist')+ '/'.replace('/',process.platform==='win32'?'\\':'/')) && target!==join(root,'dist')) fail(403,'Caminho inválido.');
   if (!existsSync(target) || !statSync(target).isFile()) fail(404,'Arquivo não encontrado. Execute npm run build.');
   const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};
   res.setHeader('Content-Type',mime[extname(target)]||'application/octet-stream'); return res.end(readFileSync(target));
  }
  if (req.headers.origin && req.headers.origin !== `http://${host}`) fail(403,'Origem não autorizada.');
  if (!['GET','HEAD'].includes(req.method) && !String(req.headers['content-type']||'').startsWith('application/json')) fail(415,'Use application/json.');
  if(path==='/api/health') return json(res,{app:'vnkb-gestao',version:2});
  if(path==='/api/auth/status') return json(res,{setup:!db.prepare('SELECT id FROM users LIMIT 1').get(),user:session(req)?publicUser(session(req)):null});
  if(path==='/api/auth/setup' && req.method==='POST') {
   rateLimit(req,'auth',10); const input=await body(req);
   const u=transaction(()=>{ if(db.prepare('SELECT id FROM users LIMIT 1').get()) fail(409,'Administrador já configurado.'); if(!input.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email||'') || String(input.password||'').length<10 || String(input.password).length>200) fail(400,'Informe nome, e-mail válido e senha de 10 a 200 caracteres.'); const u={id:randomUUID(),name:input.name.trim().slice(0,100),email:input.email.trim().toLowerCase(),role:'Administrador',active:1}; db.prepare('INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)').run(u.id,u.name,u.email,hash(input.password),u.role); const s=settings();s.businessName=String(input.businessName||'').slice(0,200);db.prepare('UPDATE settings SET data=?').run(JSON.stringify(s));audit(u,'Configurou o sistema');return u; });setSession(res,u);return json(res,{user:publicUser(u)},201);
  }
  if(path==='/api/auth/login' && req.method==='POST') { rateLimit(req,'auth',10);const input=await body(req); if(String(input.password||'').length>200) fail(400,'Senha inválida.');const u=db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(String(input.email||'').trim().toLowerCase());if(!u || !passwordValid(input.password,u.password)) fail(401,'E-mail ou senha incorretos.');setSession(res,u);audit(u,'Entrou no sistema');return json(res,{user:publicUser(u)}); }
  if(path==='/api/capture' && req.method==='POST') { rateLimit(req,'capture',15); const input=await body(req);const s=settings();if(!s.captureEnabled || req.headers['x-capture-key']!==s.captureKey) fail(403,'Captação externa não habilitada ou chave inválida.');const row=transaction(()=>save('leads',{name:input.name,email:input.email||'',phone:input.phone||'',source:'Formulário',status:'Novo',notes:input.notes||''},null));return json(res,{id:row.id},201); }
  const u=session(req); if(!u) fail(401,'Entre no sistema para continuar.');
  if(path==='/api/auth/logout' && req.method==='POST') { db.prepare('DELETE FROM sessions WHERE userId=?').run(u.id);res.setHeader('Set-Cookie','gestao_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,{ok:true}); }
  if(path==='/api/bootstrap') { const s=settings(); delete s.captureKey; return json(res,{user:publicUser(u),settings:s,modules:Object.fromEntries(Object.entries(modules).filter(([entity])=>can(u,entity))),users:allUsers().map(x=>({id:x.id,name:x.name,active:x.active})),records:Object.fromEntries(Object.keys(modules).filter(e=>can(u,e)).map(e=>[e,list(e)]))}); }
  if(path==='/api/settings' && req.method==='PUT') {admin(u);const input=await body(req);const s=settings();if(!Array.isArray(input.stages) || input.stages.length<3 || input.stages.length>12 || input.stages.some(x=>!x.id || !x.name?.trim() || x.name.length>80 || !Number.isFinite(Number(x.probability)) || Number(x.probability)<0 || Number(x.probability)>100) || new Set(input.stages.map(x=>x.id)).size!==input.stages.length || !input.stages.some(x=>x.id==='won') || !input.stages.some(x=>x.id==='lost') || ['won','lost'].includes(input.stages[0].id)) fail(400,'Configure de 3 a 12 etapas únicas, mantendo Ganho e Perdido e uma etapa aberta no início.');if(list('opportunities').some(o=>!input.stages.some(x=>x.id===o.stage))) fail(409,'Uma etapa removida ainda possui oportunidades.');const next={...s,name:String(input.name||'VNKB Gestão').slice(0,100),businessName:String(input.businessName||'').slice(0,200),proposalTerms:String(input.proposalTerms||'').slice(0,20000),autoAssign:!!input.autoAssign,captureEnabled:!!input.captureEnabled,stages:input.stages.map(x=>({id:String(x.id).slice(0,80),name:x.name.trim(),probability:x.id==='won'?100:x.id==='lost'?0:Number(x.probability)}))};db.prepare('UPDATE settings SET data=? WHERE id=1').run(JSON.stringify(next));audit(u,'Alterou configurações');delete next.captureKey;return json(res,next);}
  if(path==='/api/integrations') {admin(u);return json(res,{captureEnabled:settings().captureEnabled,captureKey:settings().captureKey,endpoint:`http://${host}/api/capture`});}
  if(path==='/api/users' && req.method==='GET') {admin(u);return json(res,allUsers());}
  if(path==='/api/users' && req.method==='POST') {admin(u);const input=await body(req);const id=input.id||randomUUID();const prev=input.id?db.prepare('SELECT * FROM users WHERE id=?').get(id):null;if(input.id&&!prev)fail(404,'Usuário não encontrado.');if(!input.name?.trim()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email||'')||!roles.includes(input.role)) fail(400,'Informe nome, e-mail e perfil válidos.');if((!prev||input.password)&&(String(input.password||'').length<10||String(input.password).length>200))fail(400,'Use senha de 10 a 200 caracteres.');if(id===u.id&&(!input.active||input.role!=='Administrador'))fail(400,'Você não pode remover o próprio acesso de administrador.');if(input.permissions!==null&&input.permissions!==undefined&&(!Array.isArray(input.permissions)||input.permissions.some(e=>!modules[e])))fail(400,'Permissões inválidas.');try{db.prepare('INSERT INTO users(id,name,email,password,role,active,permissions) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,email=excluded.email,password=excluded.password,role=excluded.role,active=excluded.active,permissions=excluded.permissions').run(id,input.name.trim().slice(0,100),input.email.trim().toLowerCase(),input.password?hash(input.password):prev.password,input.role,input.active?1:0,input.permissions?JSON.stringify(input.permissions):null);}catch(e){if(e.message.includes('UNIQUE'))fail(409,'E-mail já cadastrado.');throw e;}db.prepare('DELETE FROM sessions WHERE userId=?').run(id);audit(u,prev?'Alterou usuário':'Criou usuário','users',id,input.name);if(id===u.id)setSession(res,u);return json(res,{id});}
  if(path==='/api/audit') {admin(u);return json(res,db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 500').all());}
  if(path==='/api/backup' && req.method==='GET') {admin(u);audit(u,'Exportou backup');const s=settings();delete s.captureKey;return json(res,{format:'vnkb-gestao-v2',date:new Date().toISOString(),settings:s,records:db.prepare('SELECT entity,data FROM records').all().map(x=>({entity:x.entity,data:JSON.parse(x.data)})),attachments:db.prepare('SELECT * FROM attachments').all().map(x=>({...x,content:Buffer.from(x.content).toString('base64')})),revisions:db.prepare('SELECT * FROM revisions').all()});}
  if(path==='/api/restore' && req.method==='POST') {
   admin(u);const input=await body(req);const backup=input.backup;
   if(input.confirmation!=='RESTAURAR'||backup?.format!=='vnkb-gestao-v2'||!Array.isArray(backup.records)||backup.records.length>100000)fail(400,'Backup ou confirmação inválidos.');
   transaction(()=>{
    const ids=new Set();
    for(const entry of backup.records){if(!modules[entry.entity]||!entry.data||typeof entry.data.id!=='string'||ids.has(entry.data.id))fail(400,'Backup contém registros inválidos ou duplicados.');ids.add(entry.data.id);}
    db.exec('DELETE FROM records; DELETE FROM attachments; DELETE FROM revisions;');
    // Insere os IDs primeiro para permitir a validação dos vínculos em qualquer ordem.
    for(const {entity,data} of backup.records)db.prepare('INSERT INTO records VALUES(?,?,?)').run(data.id,entity,JSON.stringify(data));
    const originalSettings=settings();
    if(!Array.isArray(backup.settings?.stages)||!backup.settings.stages.some(s=>s.id==='won')||!backup.settings.stages.some(s=>s.id==='lost')||backup.settings.stages.some(s=>typeof s.id!=='string'||typeof s.name!=='string'||!Number.isFinite(Number(s.probability))))fail(400,'Etapas do backup inválidas.');
    db.prepare('UPDATE settings SET data=? WHERE id=1').run(JSON.stringify({...originalSettings,stages:backup.settings.stages}));
    for(const {entity,data} of backup.records){
     if(data.owner&&!db.prepare('SELECT id FROM users WHERE id=? AND active=1').get(data.owner))data.owner='';
     const value=clean(entity,data,data);
     const restored={...value,id:data.id,version:Number(data.version)||1,createdAt:data.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
     for(const key of ['convertedClientId','convertedOpportunityId','generatedOrderId','generatedReceivableId','generatedPurchasePaymentId'])if(data[key]&&ids.has(data[key]))restored[key]=data[key];
     if(Array.isArray(data.generatedMovementIds))restored.generatedMovementIds=data.generatedMovementIds.filter(id=>ids.has(id));
     putRaw(entity,restored);
    }
    for(const a of backup.attachments||[]){if(!ids.has(a.recordId)||typeof a.name!=='string'||a.name.length>200)fail(400,'Anexo inválido no backup.');const content=Buffer.from(a.content||'','base64');if(content.length>5*1024*1024)fail(400,'Anexo maior que 5 MB.');db.prepare('INSERT INTO attachments VALUES(?,?,?,?,?,?)').run(randomUUID(),a.recordId,a.name.replace(/[\\/\r\n]/g,'_'),String(a.mime||'application/octet-stream'),content,new Date().toISOString());}
    for(const rev of backup.revisions||[]){if(!ids.has(rev.recordId))continue;let data;try{data=JSON.parse(rev.data);}catch{fail(400,'Versão de proposta inválida.');}if(!Array.isArray(data.items))fail(400,'Itens da versão inválidos.');db.prepare('INSERT INTO revisions(recordId,version,data) VALUES(?,?,?)').run(rev.recordId,Number(rev.version)||1,JSON.stringify(data));}
    audit(u,'Restaurou backup','','',`${backup.records.length} registros`);
   });return json(res,{ok:true});
  }
  if(path==='/api/reset' && req.method==='POST') {admin(u);const input=await body(req);if(input.confirmation!=='ZERAR DADOS')fail(400,'Digite ZERAR DADOS para confirmar.');transaction(()=>{db.exec('DELETE FROM records; DELETE FROM attachments; DELETE FROM revisions; DELETE FROM audit;');audit(u,'Zerou todos os dados operacionais');});return json(res,{ok:true});}
  const attachment=/^\/api\/attachments\/([^/]+)$/.exec(path);
  if(attachment) {const a=db.prepare('SELECT * FROM attachments WHERE id=?').get(attachment[1]);if(!a)fail(404,'Anexo não encontrado.');const record=db.prepare('SELECT entity FROM records WHERE id=?').get(a.recordId);requireModule(u,record.entity);if(req.method==='DELETE'){db.prepare('DELETE FROM attachments WHERE id=?').run(a.id);audit(u,'Excluiu anexo',record.entity,a.recordId,a.name);return json(res,{ok:true});}res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(a.name)}`,'Cache-Control':'no-store'});return res.end(Buffer.from(a.content));}
  const match=/^\/api\/records\/([a-zA-Z]+)(?:\/([^/]+))?(?:\/([a-z]+))?$/.exec(path);
  if(match){const [,entity,id,action]=match;requireModule(u,entity);
   if(action==='convert'||action==='order'||action==='finance'||action==='stock'){if(req.method!=='POST')fail(405,'Método inválido.');return json(res,transaction(()=>convert(entity,id,action,u)));}
   if(action==='history'){find(entity,id);return json(res,{audit:db.prepare('SELECT * FROM audit WHERE recordId=? ORDER BY id DESC').all(id),attachments:db.prepare('SELECT id,name,date,length(content) AS size FROM attachments WHERE recordId=?').all(id),revisions:db.prepare('SELECT version,data FROM revisions WHERE recordId=? ORDER BY version DESC').all(id).map(x=>({...x,data:JSON.parse(x.data)}))});}
   if(action==='attachments' && req.method==='POST'){find(entity,id);const input=await body(req);const content=Buffer.from(String(input.content||''),'base64');if(!input.name||String(input.name).length>200||!content.length||content.length>5*1024*1024)fail(400,'Anexo deve ter nome e tamanho entre 1 byte e 5 MB.');const aid=randomUUID();db.prepare('INSERT INTO attachments VALUES(?,?,?,?,?,?)').run(aid,id,String(input.name).replace(/[\\/\r\n]/g,'_'),String(input.mime||'application/octet-stream').slice(0,100),content,new Date().toISOString());audit(u,'Anexou documento',entity,id,input.name);return json(res,{id:aid},201);}
   if(action)fail(404,'Ação não encontrada.');
   if(req.method==='GET')return json(res,id?find(entity,id):list(entity));
   if(req.method==='POST'&&!id){const input=await body(req);return json(res,transaction(()=>save(entity,input,u)),201);}
   if(req.method==='PUT'&&id){const input=await body(req);return json(res,transaction(()=>save(entity,input,u,id)));}
   if(req.method==='DELETE'&&id){transaction(()=>remove(entity,id,u));return json(res,{ok:true});}
  }
  if(path==='/api/import'&&req.method==='POST'){const input=await body(req);if(!['leads','clients','companies','products'].includes(input.entity))fail(400,'Importação não disponível neste módulo.');requireModule(u,input.entity);if(!Array.isArray(input.rows)||input.rows.length>2000)fail(400,'Importe no máximo 2.000 linhas por vez.');let skipped=0;const result=transaction(()=>input.rows.flatMap((row,index)=>{if(row.email&&list(input.entity).some(r=>r.email.toLowerCase()===String(row.email).trim().toLowerCase())){skipped++;return [];}try{return [save(input.entity,row,u)];}catch(e){fail(400,`Linha ${index+2}: ${e.message}`);}}));return json(res,{imported:result.length,skipped});}
  fail(404,'Recurso não encontrado.');
 }catch(e){if(!res.headersSent)json(res,{error:e.status?e.message:'Não foi possível concluir a operação.'},e.status||500);else res.end();if(!e.status)console.error(e);}
});
http.listen(port,'127.0.0.1',()=>console.log(`VNKB Gestão ERP + CRM: http://127.0.0.1:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>http.close(async()=>{await vite?.close();db.close();process.exit(0);}));
