const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const {transformSync}=require('@babel/core');
const source=fs.readFileSync(path.join(__dirname,'../src/screens/shared/WhatsAppBotScreen.js'),'utf8');
const compiled=transformSync(source,{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs','@babel/plugin-transform-react-jsx']}).code;
const flatten=node=>node==null||typeof node==='boolean'?'':typeof node!=='object'?String(node):Array.isArray(node)?node.map(flatten).join(' '):node.children.map(flatten).join(' ');
const nodes=(node,predicate,result=[])=>{if(Array.isArray(node))node.forEach(x=>nodes(x,predicate,result));else if(node&&typeof node==='object'){if(predicate(node))result.push(node);node.children?.forEach(x=>nodes(x,predicate,result));}return result;};
function harness(auth,ask,submit){
 const slots=[],effects=[],timers=[];let cursor=0,dirty=false,tree;const calls=[];
 const state=(value)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return [slots[i],value=>{const next=typeof value==='function'?value(slots[i]):value;if(next!==slots[i]){slots[i]=next;dirty=true;}}];};
 const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:state,useRef:value=>{const i=cursor++;if(!(i in slots))slots[i]={current:value};return slots[i];},useContext:()=>auth,useCallback:fn=>fn,useEffect:(fn,deps)=>{const i=cursor++;const old=slots[i];if(!old||!deps||deps.some((x,j)=>x!==old.deps?.[j])){old?.cleanup?.();slots[i]={deps};effects.push(()=>{slots[i].cleanup=fn();});}}};
 const module={exports:{}};const theme={colors:{white:'white',muted:'grey'},radius:{},typography:{},typeScale:{}};
 vm.runInNewContext(compiled,{module,exports:module.exports,Date,setTimeout:(fn,delay)=>{const t={fn,delay};timers.push(t);return t;},clearTimeout:t=>{if(t)t.cancelled=true;},require:name=>{
 if(name==='react')return React;if(name==='react-native')return {View:'View',ScrollView:'ScrollView',TouchableOpacity:'TouchableOpacity',KeyboardAvoidingView:'KeyboardAvoidingView',SafeAreaView:'SafeAreaView',ActivityIndicator:'ActivityIndicator',Platform:{OS:'android'},Linking:{openURL:async()=>{}},StyleSheet:{create:x=>x}};
 if(name.includes('AppTextInput'))return 'TextInput';if(name.includes('AppText'))return 'AppText';if(name==='react-native-vector-icons/Ionicons')return 'Icon';if(name==='../../theme')return theme;if(name==='../../context/AuthContext')return {AuthContext:{}};
 if(name==='../../services/accountAssistantService')return {askAccountAssistant:async(...args)=>{calls.push(args);return ask(...args);},submitAssistantTicket:submit,needsAccount:text=>/\b(my|mine|balance|status|pending|ticket|complaint)\b/i.test(text)};
 throw Error('Unexpected import '+name);
 }});
 const Screen=module.exports.default;
 const render=()=>{let count=0;do{dirty=false;cursor=0;tree=Screen({navigation:{navigate:()=>{},goBack:()=>{}}});effects.splice(0).forEach(fn=>fn());if(++count>20)throw Error('Render loop');}while(dirty);return tree;};
 const flush=()=>{for(const timer of timers.splice(0))if(!timer.cancelled && timer.delay>=1000)timer.fn();render();};
 const send=async text=>{nodes(tree,n=>n.type==='TextInput')[0].props.onChangeText(text);render();await nodes(tree,n=>n.type==='TextInput')[0].props.onSubmitEditing();render();};
 render();flush();return {render,send,calls,text:()=>flatten(tree),submit:()=>nodes(tree,n=>n.type==='TouchableOpacity'&&flatten(n)==='Submit ticket')[0]?.props.onPress()};
}
(async()=>{
 let queryCount=0;const guest=harness({isAuthenticated:false,user:null},()=>{queryCount++;},()=>{});await guest.send('My wallet balance');assert.match(guest.text(),/Sign in to your account/);assert.equal(queryCount,0);
 const auth={isAuthenticated:true,user:{id:42,user_type:'tenant'}};let ticketCalls=0;const app=harness(auth,async text=>text.startsWith('Create')?{handled:true,text:'Review request',ticketDraft:{subject:'Pending withdrawal',description:'My withdrawal is pending'}}:{handled:true,text:'PRIVATE balance ₦25,000',topic:'wallet',link:'/dashboard',linkText:'Open wallet'},async()=>{ticketCalls++;return {id:123,status:'open'};});
 await app.send('My wallet balance');assert.match(app.text(),/PRIVATE balance ₦25,000/);await app.send('Create a ticket: My withdrawal is pending');assert.match(app.text(),/Submit ticket/);assert.equal(ticketCalls,0);const first=app.submit();app.submit();await first;app.render();assert.equal(ticketCalls,1);assert.match(app.text(),/ticket #123 has been submitted/);auth.isAuthenticated=false;auth.user=null;app.render();assert.doesNotMatch(app.text(),/PRIVATE balance|Pending withdrawal|ticket #123/);
 let finish;const pendingAuth={isAuthenticated:true,user:{id:42,user_type:'tenant'}};const pending=harness(pendingAuth,()=>new Promise(resolve=>{finish=resolve;}),()=>{});const waiting=pending.send('My payments');pendingAuth.isAuthenticated=false;pendingAuth.user=null;pending.render();finish({handled:true,text:'PRIVATE LATE RESPONSE'});await waiting;assert.doesNotMatch(pending.text(),/PRIVATE LATE RESPONSE/);
 console.log('Android/iOS assistant behavior passed: guest sign-in card, live account reply, ticket review, single submission, reference confirmation, logout clearing and late-response protection.');
})().catch(error=>{console.error(error);process.exitCode=1;});
