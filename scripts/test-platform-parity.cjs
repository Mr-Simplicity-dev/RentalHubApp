const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm'), babel = require('@babel/core');
const { getIdentityRequirements } = require('../src/utils/identityReview.cjs');

function loadService(name) {
  const requests = [], module = {exports:{}};
  const code = babel.transformSync(fs.readFileSync(path.join(__dirname,'../src/services',name+'.js'),'utf8'),{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code;
  const api = Object.fromEntries(['get','post','patch','delete'].map(method => [method,async(...args)=>{requests.push({method,args});return {data:{success:true,data:[]}};}]));
  vm.runInNewContext(code,{module,exports:module.exports,require:name=>{if(name==='./api')return {default:api,__esModule:true};throw Error(name);}});
  return {service:module.exports.default||module.exports.adminService||module.exports.superAdminService,requests};
}

test('mobile verification readiness distinguishes actual evidence from a status label',()=>{
  assert.equal(getIdentityRequirements({nin:'masked'}).ready,false);
  assert.equal(getIdentityRequirements({has_live_photo:true,has_identity_document:true}).ready,true);
  assert.equal(getIdentityRequirements({identity_verification_status:'pending',has_live_photo:false,has_identity_document:true}).ready,false);
});
test('Super Admin verify, delete and promotion forward the entered decision note',async()=>{
  const {service,requests}=loadService('superAdminService');
  await service.approveVerification(7,'Photo and document checked');
  await service.deleteUser(7,'Duplicate account confirmed');
  await service.promoteUser(7,'Approved staff appointment');
  assert.equal(requests[0].args[1].review_note,'Photo and document checked');
  assert.equal(requests[1].args[1].data.reason,'Duplicate account confirmed');
  assert.equal(requests[2].args[1].reason,'Approved staff appointment');
});
test('fumigation requests use the actual server methods, routes and GPS field names',async()=>{
  const {service,requests}=loadService('fumigationTrackingService');
  await service.getAssignedJobs();await service.updateJobStatus(8,{newStatus:'arrived_on_site'});
  await service.sendLocationPing({bookingId:8,latitude:9,longitude:7,batteryLevel:40});
  await service.submitServiceReport({bookingId:8,chemical_name:'Recorded product'});
  await service.reportIncident({bookingId:8,incident_type:'delay'});
  assert.equal(requests[0].args[0],'/fumigation/team/assigned');
  assert.equal(requests[1].method,'post');assert.equal(requests[1].args[0],'/fumigation/team/jobs/8/status');
  assert.equal(requests[1].args[1].status,'arrived_on_site');
  assert.equal(requests[2].args[0],'/fumigation/team/jobs/8/ping');assert.equal(requests[2].args[1].battery_level,40);
  assert.equal(requests[3].args[0],'/fumigation/team/jobs/8/report');assert.equal(requests[4].args[0],'/fumigation/team/jobs/8/incidents');
});
test('transportation requests use the actual assigned, status and location contracts',async()=>{
  const {service,requests}=loadService('transportationTrackingService');
  await service.getDriverTrips();await service.updateTripStatus(9,{newStatus:'in_transit'});
  await service.sendLocationPing({bookingId:9,latitude:9,longitude:7,batteryLevel:35});
  assert.equal(requests[0].args[0],'/transportation/driver/assigned');
  assert.equal(requests[1].method,'post');assert.equal(requests[1].args[0],'/transportation/driver/status');
  assert.equal(requests[1].args[1].booking_id,9);assert.equal(requests[1].args[1].status,'in_transit');
  assert.equal(requests[2].args[0],'/transportation/driver/location');assert.equal(requests[2].args[1].booking_id,9);assert.equal(requests[2].args[1].battery_level,35);
});
