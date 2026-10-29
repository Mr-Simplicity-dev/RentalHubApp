const fs = require('node:fs');
const copy = JSON.parse(fs.readFileSync('src/i18n/interfaceCopy.json', 'utf8'));
const notice = Object.values(copy).find(row => row.en?.startsWith('If you choose bank transfer, a collection account'));
if (!notice) throw Error('Registration banking notice not found');
Object.assign(notice, {
  ha: 'Idan ka zaɓi tura kuɗi ta banki, abokin aikinmu na banki da ke ƙarƙashin kulawar hukumomi zai iya buɗe asusun karɓar kuɗi da sunanka. Don wannan dalili kaɗai, yana karɓar sunanka da kuma NIN daga bayanan shaidarka da aka tantance idan bankin ya bukace shi. Wannan asusun ba ya riƙe kuɗin walat ɗinka.',
  yo: 'Bí o bá yan ìfiránṣẹ́ owó báńkì, alábàáṣiṣẹ́ báńkì wa tí ó wà lábẹ́ ìṣàkóso lè ṣí àkọọ́lẹ̀ gbígba owó ní orúkọ rẹ. Fún ète yìí nìkan, ó gba orúkọ rẹ àti NIN láti inú àkọsílẹ̀ ìdánimọ̀ rẹ tí a ti jẹ́rìí, bí báńkì alábàáṣiṣẹ́ bá béèrè rẹ̀. Àkọọ́lẹ̀ yìí kì í tọ́jú iye owó tó wà nínú àpamọ́wọ́ rẹ.',
  ig: 'Ọ bụrụ na ị họrọ nnyefe ego ụlọ akụ, ụlọ akụ anyị na ya na-arụkọ ọrụ nke nọ n’okpuru nlekọta iwu nwere ike imeghe akaụntụ nnata ego n’aha gị. Maka ebumnuche a naanị, ọ na-anata aha gị na NIN sitere na ndekọ njirimara gị enyochara ma ọ bụrụ na ụlọ akụ ahụ chọrọ ya. Akaụntụ a anaghị ejide ego dị na obere akpa gị.'
});
copy['fumigation & cleaning catalog'].yo = 'Àtòjọ iṣẹ́ pípa kòkòrò àti ìmọ́tótó';
const reviewed = {
  '/month, you can put': ['/wata, za ka iya saka', '/oṣù, o lè fi sílẹ̀', '/ọnwa, ị nwere ike itinye'],
  '/year).': ['/shekara).', '/ọdún).', '/afọ).'],
  '/month': ['/wata', '/oṣù', '/ọnwa'],
  'Amana RentalHub Assistant': ['Mataimakin Amana RentalHub', 'Olùrànlọ́wọ́ Amana RentalHub', 'Onye enyemaka Amana RentalHub'],
  'Agent Dashboard': ['Shafin gudanarwar wakili', 'Ojú ìṣàkóso aṣojú', 'Dashboard onye nnọchi anya'],
  'Select Service': ['Zaɓi sabis', 'Yan iṣẹ́', 'Họrọ ọrụ'],
  'Duration: ~': ['Tsawon lokaci: ~', 'Àkókò: ~', 'Ogologo oge: ~'],
  'APPLICATION #': ['BUƘATA #', 'ÌBÉÈRÈ #', 'AKWỤKWỌ ANAMACHỌIHE #'],
  'PREMIUM ACCESS': ['SAMUN DAMA NA MUSAMMAN', 'ÀǸFÀÀNÍ PÀTÀKÌ', 'NNWETA PỤRỤ ICHE'],
  'Property Details': ['Bayanan kadara', 'Àlàyé ilé', 'Nkọwa ụlọ'],
  'RentalHub app version': ['Sigar manhajar RentalHub', 'Ẹ̀yà app RentalHub', 'Nsụgharị ngwa RentalHub'],
  'Other': ['Sauran', 'Mìíràn', 'Ọzọ'],
  'Basic': ['Na asali', 'Ìpìlẹ̀', 'Nke isi'],
  'Premium': ['Na musamman', 'Pàtàkì', 'Pụrụ iche'],
  'Wallet': ['Walat', 'Àpamọ́wọ́', 'Obere akpa ego'],
  'Ref: ': ['Shaida: ', 'Ìtọ́kasí: ', 'Ntụaka: '],
  'Addons': ['Ƙarin abubuwa', 'Àwọn àfikún', 'Ihe mgbakwunye'],
  'Chamber: ': ['Ofishin lauya: ', 'Ọ́fíìsì agbẹjọ́rò: ', 'Ọfịs onye ọka iwu: '],
  'PORTFOLIO': ['TARIN KADARORI', 'ÀKÓJỌPỌ̀ ILÉ', 'NCHỊKỌTA ỤLỌ'],
  'Bio': ['Taƙaitaccen tarihin kai', 'Àlàyé ara ẹni', 'Nkọwa onwe'],
  'All': ['Duka', 'Gbogbo', 'Niile'],
  'Bedroom': ['Ɗakin kwana', 'Yàrá ìsùn', 'Ime ụlọ ihi ụra'],
  'Mold': ['Ƙwayar danshi', 'Ìmọ́dù', 'Ebu'],
  'Biometric': ['Shaidar halitta', 'Ìdánimọ̀ ara', 'Njirimara ahụ'],
  'Menu': ['Jerin zaɓuɓɓuka', 'Àtòjọ àṣàyàn', 'Ndepụta nhọrọ'],
  'Apartment': ['Gidan zama', 'Yàrá ilé gbígbé', 'Ụlọ obibi'],
  'Duplex': ['Gida mai hawa biyu', 'Ilé alájà méjì', 'Ụlọ okpukpu abụọ'],
  'Studio': ['Ɗaki ɗaya mai kayan zama', 'Yàrá kan fún gbogbo ohun', 'Ụlọ nwere otu ime ụlọ'],
  'Bungalow': ['Gida marar hawa', 'Ilé alájà kan', 'Ụlọ na-enweghị elu ụlọ'],
  'Flat': ['Sashen gidan zama', 'Àpá ilé gbígbé', 'Otu ebe obibi n’ụlọ'],
  'Mansion': ['Ƙaton gida', 'Ilé ńlá', 'Nnukwu ụlọ'],
  'Terrace': ['Gida mai jere', 'Ilé tó wà ní ìlà', 'Ụlọ ndị jikọtara n’ahịrị']
};
for (const [en, translations] of Object.entries(reviewed)) {
  const key = en.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!copy[key]) continue;
  for (const [i, locale] of ['ha', 'yo', 'ig'].entries()) copy[key][locale] = translations[i];
}
fs.writeFileSync('src/i18n/interfaceCopy.json', JSON.stringify(copy, null, 2) + '\n');
console.log('Reviewed banking consent and service-catalogue wording saved.');
