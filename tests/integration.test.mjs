import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { modules } from '../crm-model.mjs';
const dir=mkdtempSync(join(tmpdir(),'vnkb-test-'));
const port=String(19000+Math.floor(Math.random()*1000));
const base=`http://127.0.0.1:${port}/api`;
let child,cookie='',out='';
async function call(path,method='GET',data,session=cookie){const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',cookie:session},body:data===undefined?undefined:JSON.stringify(data)});const body=await res.json();return {status:res.status,body,cookie:res.headers.get('set-cookie')?.split(';')[0]};}
function draft(entity,values={}){return Object.fromEntries([...modules[entity].fields.filter(f=>f.type==='select').map(f=>[f.key,f.options[0]]),...Object.entries(values)]);}
async function create(entity,values){const res=await call('/records/'+entity,'POST',draft(entity,values));assert.equal(res.status,201,JSON.stringify(res.body));return res.body;}
before(async()=>{child=spawn(process.execPath,['server.mjs','--production'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:port,APP_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>out+=d);for(let i=0;i<80;i++){try{if((await call('/health')).status===200)return;}catch{}await sleep(100);}throw new Error(out);});
after(async()=>{if(child&&child.exitCode===null){const exited=new Promise(resolve=>child.once('exit',resolve));child.kill();await exited;}assert.ok(resolve(dir).startsWith(resolve(tmpdir(),'vnkb-test-')));rmSync(dir,{recursive:true,force:true});});
test('Instalação zerada e autenticação segura',async()=>{
 assert.equal((await call('/auth/status')).body.setup,true);
 assert.equal((await call('/bootstrap')).status,401);
 const setup=await call('/auth/setup','POST',{name:'Admin de teste',businessName:'Empresa de teste',email:'admin@example.test',password:'Senha-de-teste-123'});
 assert.equal(setup.status,201);cookie=setup.cookie;assert.ok(cookie);
 assert.equal((await call('/auth/setup','POST',{})).status,409);
 const state=(await call('/bootstrap')).body;assert.ok(Object.values(state.records).every(rows=>rows.length===0));assert.equal(state.user.role,'Administrador');assert.ok(!JSON.stringify(state).includes('captureKey'));
 assert.equal((await call('/auth/login','POST',{email:'admin@example.test',password:'errada'},'')).status,401);
});
let lead,client,opportunity,proposal,order,entry,product,automation;
test('Lead, automação, distribuição e conversão sem duplicação',async()=>{
 automation=await create('automations',{name:'Follow-up',trigger:'Lead criado',taskTitle:'Entrar em contato',days:1,status:'Ativa'});
 lead=await create('leads',{name:'Contato de teste',email:'contato@example.test'});assert.ok(lead.owner);
 let state=(await call('/bootstrap')).body;assert.equal(state.records.tasks.length,1);assert.equal(state.records.tasks[0].leadId,lead.id);
 const converted=await call(`/records/leads/${lead.id}/convert`,'POST',{});assert.equal(converted.status,200);client=converted.body.client;opportunity=converted.body.opportunity;assert.equal(client.email,lead.email);
 assert.equal((await call(`/records/leads/${lead.id}/convert`,'POST',{})).status,409);
 assert.equal((await call(`/records/clients/${client.id}`,'DELETE',{})).status,409);
});
test('Proposta versionada, pedido e financeiro compartilham os dados',async()=>{
 product=await create('products',{name:'Serviço de teste',type:'Serviço',price:125});
 proposal=await create('proposals',{name:'Proposta teste',clientId:client.id,opportunityId:opportunity.id,items:[{productId:product.id,description:product.name,quantity:2,price:125}],discount:25,status:'Rascunho',amount:999999});assert.equal(proposal.amount,225);
 assert.equal((await call(`/records/proposals/${proposal.id}/order`,'POST',{})).status,400);
 const update=await call(`/records/proposals/${proposal.id}`,'PUT',{...proposal,status:'Aprovada'});assert.equal(update.status,200);proposal=update.body;
 assert.equal((await call(`/records/proposals/${proposal.id}/history`)).body.revisions.length,2);
 const result=await call(`/records/proposals/${proposal.id}/order`,'POST',{});assert.equal(result.status,200);order=result.body;assert.equal(order.amount,225);assert.equal(order.clientId,client.id);
 assert.equal((await call(`/records/proposals/${proposal.id}/order`,'POST',{})).status,409);
 const finance=await call(`/records/orders/${order.id}/finance`,'POST',{});assert.equal(finance.status,200);entry=finance.body;assert.equal(entry.amount,225);assert.equal(entry.orderId,order.id);
 assert.equal((await call(`/records/orders/${order.id}/finance`,'POST',{})).status,409);
 assert.equal((await call(`/records/receivables/${entry.id}`,'PUT',{...entry,status:'Pago'})).status,400);
 assert.equal((await call(`/records/receivables/${entry.id}`,'PUT',{...entry,status:'Pago',paidDate:'2026-09-08'})).status,200);
});
test('Validação de etapas, concorrência e transações de importação',async()=>{
 assert.equal((await call(`/records/opportunities/${opportunity.id}`,'PUT',{...opportunity,stage:'lost'})).status,400);
 const update=await call(`/records/opportunities/${opportunity.id}`,'PUT',{...opportunity,stage:'won',amount:225});assert.equal(update.status,200);assert.equal(update.body.probability,100);assert.ok(update.body.closedAt);
 assert.equal((await call(`/records/opportunities/${opportunity.id}`,'PUT',{...opportunity,stage:'qualified'})).status,409);
 const before=(await call('/records/leads')).body.length;
 const imported=await call('/import','POST',{entity:'leads',rows:[draft('leads',{name:'Válido',email:'valido@example.test'}),draft('leads',{name:''})]});assert.equal(imported.status,400);assert.equal((await call('/records/leads')).body.length,before);
 const duplicate=await call('/import','POST',{entity:'leads',rows:[draft('leads',{name:'Duplicado',email:lead.email})]});assert.equal(duplicate.status,200);assert.equal(duplicate.body.skipped,1);
});
test('ERP: estoque consistente, compras, RH, frota e contratos',async()=>{
 const p=await create('products',{name:'Produto físico',type:'Produto',price:10});
 const incoming=await create('movements',{name:'Entrada',productId:p.id,type:'Entrada',quantity:10,date:'2026-09-08'});
 await create('movements',{name:'Saída',productId:p.id,type:'Saída',quantity:4,date:'2026-09-08'});
 assert.equal((await call('/records/movements','POST',draft('movements',{name:'Excesso',productId:p.id,type:'Saída',quantity:7,date:'2026-09-08'}))).status,400);
 assert.equal((await call(`/records/movements/${incoming.id}`,'DELETE',{})).status,409);
 const supplier=await create('suppliers',{name:'Fornecedor teste'});
 const purchase=await create('purchases',{name:'Compra teste',supplierId:supplier.id,items:[{productId:p.id,description:p.name,quantity:2,price:10}],status:'Aprovada'});
 const expense=await call(`/records/purchases/${purchase.id}/finance`,'POST',{});assert.equal(expense.status,200);assert.equal(expense.body.type,'Despesa');
 const employee=await create('employees',{name:'Colaborador teste',salary:3000});await create('payroll',{name:'Salário',employeeId:employee.id,month:'2026-09',amount:3000});
 const vehicle=await create('vehicles',{name:'Veículo teste',plate:'AAA0A00'});await create('fleetCosts',{name:'Manutenção',vehicleId:vehicle.id,date:'2026-09-08',amount:100});
 await create('contracts',{name:'Contrato teste',clientId:client.id,startDate:'2026-09-08',endDate:'2027-09-08'});
});
test('Recebimento e entrega movimentam estoque uma única vez',async()=>{
 const product=await create('products',{name:'Estoque integrado',type:'Produto',price:20});
 const purchase=await create('purchases',{name:'Recebimento integrado',items:[{productId:product.id,description:product.name,quantity:5,price:20}],status:'Aprovada'});
 const receive=await call(`/records/purchases/${purchase.id}/stock`,'POST',{});assert.equal(receive.status,200);assert.equal(receive.body.status,'Recebida');assert.equal(receive.body.generatedMovementIds.length,1);
 assert.equal((await call(`/records/purchases/${purchase.id}/stock`,'POST',{})).status,409);
 const order=await create('orders',{name:'Entrega integrada',items:[{productId:product.id,description:product.name,quantity:3,price:20}]});
 const delivery=await call(`/records/orders/${order.id}/stock`,'POST',{});assert.equal(delivery.status,200);assert.equal(delivery.body.status,'Concluído');
 const moves=(await call('/records/movements')).body.filter(m=>m.productId===product.id);assert.equal(moves.reduce((n,m)=>n+(m.type==='Entrada'?1:-1)*m.quantity,0),2);
 const another=await create('orders',{name:'Saldo insuficiente',items:[{productId:product.id,description:product.name,quantity:3,price:20}]});assert.equal((await call(`/records/orders/${another.id}/stock`,'POST',{})).status,400);assert.equal((await call('/records/movements')).body.filter(m=>m.productId===product.id).length,2);
 assert.equal((await call(`/records/movements/${moves[0].id}`,'PUT',{...moves[0],quantity:1})).status,409);
});
test('Captação exige habilitação e chave, e não expõe credenciais no painel',async()=>{
 assert.equal((await call('/capture','POST',{name:'Lead externo'},'')).status,403);
 const s=(await call('/bootstrap')).body.settings;
 assert.equal((await call('/settings','PUT',{...s,captureEnabled:true})).status,200);
 const config=(await call('/integrations')).body;
 const response=await fetch(base+'/capture',{method:'POST',headers:{'Content-Type':'application/json','X-Capture-Key':config.captureKey},body:JSON.stringify({name:'Lead externo'})});assert.equal(response.status,201);
 assert.equal((await call('/settings','PUT',{...s,captureEnabled:false})).status,200);
});
test('Permissões são impostas pela API; segredos não vazam',async()=>{
 const user=await call('/users','POST',{name:'Vendedor teste',email:'vendedor@example.test',password:'Senha-vendedor-123',role:'Vendedor',active:true,permissions:null});assert.equal(user.status,200);
 const login=await call('/auth/login','POST',{email:'vendedor@example.test',password:'Senha-vendedor-123'},'');assert.equal(login.status,200);
 assert.equal((await call('/records/employees','GET',undefined,login.cookie)).status,403);
 assert.equal((await call('/records/receivables','POST',{name:'Indevido'},login.cookie)).status,403);
 assert.equal((await call('/backup','GET',undefined,login.cookie)).status,403);
 assert.equal((await call('/settings','PUT',{},login.cookie)).status,403);
 const bootstrap=(await call('/bootstrap','GET',undefined,login.cookie)).body;assert.ok(!bootstrap.records.employees);assert.ok(!JSON.stringify(bootstrap).includes('Senha-'));
 const badOrigin=await fetch(base+'/auth/logout',{method:'POST',headers:{cookie,'Content-Type':'application/json',origin:'https://example.test'},body:'{}'});assert.equal(badOrigin.status,403);
 const privateFile=await fetch(base.replace('/api','')+'/local-data/gestao.sqlite');assert.equal(privateFile.status,404);
});
test('Anexos, backup e restauração atômica; reset deixa a base vazia',async()=>{
 const attached=await call(`/records/clients/${client.id}/attachments`,'POST',{name:'arquivo.txt',mime:'text/plain',content:Buffer.from('documento teste').toString('base64')});assert.equal(attached.status,201);
 const attachment=await fetch(base+'/attachments/'+attached.body.id,{headers:{cookie}});assert.equal(await attachment.text(),'documento teste');assert.match(attachment.headers.get('content-disposition'),/attachment/);
 const backup=(await call('/backup')).body;assert.equal(backup.format,'vnkb-gestao-v2');assert.equal(backup.attachments.length,1);assert.ok(!JSON.stringify(backup).includes('captureKey'));
 const invalid=structuredClone(backup);invalid.records.push({entity:'invalid',data:{id:'bad'}});assert.equal((await call('/restore','POST',{confirmation:'RESTAURAR',backup:invalid})).status,400);assert.ok((await call('/records/clients')).body.length);
 assert.equal((await call('/reset','POST',{confirmation:'errado'})).status,400);
 assert.equal((await call('/reset','POST',{confirmation:'ZERAR DADOS'})).status,200);
 assert.equal((await call('/records/clients')).body.length,0);
 const restore=await call('/restore','POST',{confirmation:'RESTAURAR',backup});assert.equal(restore.status,200,JSON.stringify(restore.body));assert.equal((await call('/records/clients')).body.length,1);assert.equal((await call(`/records/clients/${client.id}/history`)).body.attachments.length,1);
 assert.equal((await call('/reset','POST',{confirmation:'ZERAR DADOS'})).status,200);const state=(await call('/bootstrap')).body;assert.ok(Object.values(state.records).every(rows=>rows.length===0));assert.equal((await call('/auth/status')).body.setup,false);
});
