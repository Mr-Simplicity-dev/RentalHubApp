const {test}=require('node:test');
const assert=require('node:assert/strict');
const {nextPhotoStep,holdClosedEyes}=require('../src/utils/livePhotoSequence.cjs');
const face=eyes=>({frame:{left:100,top:100,width:200,height:240},rotationY:0,rotationZ:0,leftEyeOpenProbability:eyes,rightEyeOpenProbability:eyes});
test('front-camera capture requires one centered face and open, closed, open eyes',()=>{
 assert.equal(nextPhotoStep(0,[face(0.9)],400,500),1);
 assert.equal(nextPhotoStep(1,[face(0.1)],400,500),2);
 assert.equal(nextPhotoStep(2,[face(0.9)],400,500),3);
 for(const faces of [[],[face(0.9),face(0.9)],[{...face(0.9),rotationY:45}],[{...face(0.9),leftEyeOpenProbability:undefined}]])assert.equal(nextPhotoStep(0,faces,400,500),0);
 assert.equal(nextPhotoStep(2,[face(0.1)],400,500),2);
});
test('closed-eye instruction requires a full second and resets when tracking is lost',()=>{
 const first=holdClosedEyes(true,null,100);assert.equal(first.complete,false);
 assert.equal(holdClosedEyes(true,first.since,750).complete,false);
 assert.equal(holdClosedEyes(true,first.since,1100).complete,true);
 const reset=holdClosedEyes(false,first.since,900);assert.equal(reset.since,null);
 assert.equal(holdClosedEyes(true,reset.since,1200).complete,false);
});
