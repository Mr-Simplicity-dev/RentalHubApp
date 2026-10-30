const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const React=require('react');const {transformSync}=require('@babel/core');
const runtime=require('../src/i18n/interfaceRuntime.cjs');
const compiled=transformSync(fs.readFileSync('src/screens/auth/LoginScreen.js','utf8'),{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs','@babel/plugin-transform-react-jsx']}).code;
const slots=[];let cursor=0,notice;
const react={...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useRef:v=>({current:v}),useEffect:()=>{},useContext:()=>({login:async()=>({success:false}),loginWithBiometrics:async()=>({success:false})})};
const native={StyleSheet:{create:x=>x},Platform:{OS:'android'},Alert:{alert:()=>{}},Keyboard:{addListener:()=>({remove(){}})},useWindowDimensions:()=>({height:812,width:375})};for(const name of ['View','ScrollView','KeyboardAvoidingView','TouchableOpacity','StatusBar'])native[name]=name;
const mod={exports:{}};
vm.runInNewContext(compiled,{exports:mod.exports,module:mod,require:name=>{
 if(name==='react')return react;if(name==='react-native')return native;
 if(name.includes('interfaceRuntime'))return runtime;
 if(name.includes('useInterfaceLanguage'))return {__esModule:true,default:()=>{}};
 if(name.includes('LanguageContext'))return {useLanguage:()=>({language:runtime.getInterfaceLanguage()})};
 if(name.includes('assistedRegistration.json'))return require('../src/i18n/assistedRegistration.json');
 if(name==='react-native-safe-area-context')return {SafeAreaView:'SafeAreaView'};
 if(name==='react-native-toast-message')return {__esModule:true,default:{show:value=>{notice=value;}}};
 if(name.includes('AuthContext'))return {AuthContext:{}};
 if(name==='../../theme')return {colors:{},radius:{},shadows:{},typography:{},typeScale:{}};
 return {__esModule:true,default:name};
}});
const nodes=[];function visit(node){if(Array.isArray(node))return node.forEach(visit);if(!node?.props)return;nodes.push(node);visit(node.props.children);}
function render(){cursor=0;nodes.length=0;visit(mod.exports.default({navigation:{goBack(){},navigate(){},addListener(){return()=>{};}}}));return nodes;}
(async()=>{
 runtime.setInterfaceLanguage('ar');render();
 const texts=nodes.flatMap(n=>typeof n.props.children==='string'?[n.props.children]:[]);
 for(const text of ['مرحبًا بعودتك','سعداء بعودتك.','هل نسيت كلمة المرور؟','إنشاء حساب'])assert.ok(texts.some(value=>value.trim()===text),text);
 assert.ok(!texts.some(text=>['WELCOME BACK','Good to see you again.','New to RentalHub?'].includes(text)));
 const inputs=nodes.filter(n=>typeof n.props.onChangeText==='function');assert.equal(inputs[1].props.label,'كلمة المرور');
 const signIn=nodes.find(n=>n.props.title==='تسجيل الدخول');await signIn.props.onPress();assert.equal(notice.text1,'خطأ');assert.equal(notice.text2,'يرجى ملء جميع الحقول');
 inputs[0].props.onChangeText('user@example.com');inputs[1].props.onChangeText('Password');
 for(const lang of ['en','ar','en','ar']){runtime.setInterfaceLanguage(lang);render();const fields=nodes.filter(n=>typeof n.props.onChangeText==='function');assert.equal(fields[0].props.value,'user@example.com');assert.equal(fields[1].props.value,'Password');assert.equal(fields[1].props.label,lang==='ar'?'كلمة المرور':'Password');}
 for(const lang of ['ha','yo','ig']){
  runtime.setInterfaceLanguage(lang);render();
  const fields=nodes.filter(n=>typeof n.props.onChangeText==='function');
  assert.equal(fields[0].props.value,'user@example.com');assert.equal(fields[1].props.value,'Password');
  assert.notEqual(fields[1].props.label,'Password');
  const values=nodes.flatMap(n=>typeof n.props.children==='string'?[n.props.children.trim()]:[]);
  assert.ok(values.includes(runtime.translateUi('Good to see you again.')));
  assert.ok(!values.includes('Good to see you again.'));
  fields[0].props.onChangeText('');fields[1].props.onChangeText('');render();
  const submit=nodes.find(n=>n.props.title===runtime.translateUi('Sign in'));await submit.props.onPress();
  assert.equal(notice.text2,runtime.translateUi('Please fill in all fields'));assert.notEqual(notice.text2,'Please fill in all fields');
  const cleared=nodes.filter(n=>typeof n.props.onChangeText==='function');cleared[0].props.onChangeText('user@example.com');cleared[1].props.onChangeText('Password');
 }
 let changes=0;const unsubscribe=runtime.subscribeInterfaceLanguage(()=>changes++);runtime.setInterfaceLanguage('en');runtime.setInterfaceLanguage('en');assert.equal(changes,1);unsubscribe();
 assert.ok(fs.readFileSync('src/components/common/TurnstileWidget.js','utf8').includes("language: '${language}'"));
 console.log('Arabic, Hausa, Yoruba and Igbo Login labels, validation, English round trips, live subscriptions, preserved email/password values and security-widget language passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
