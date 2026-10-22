// Ready-made notice and minutes wording, written natively in Marathi, Hindi and English.
// Each template lists its fields and builds { heading, body } from what the committee fills in.
const pick = (L, mr, hi, en) => (L === 'en' ? en : L === 'hi' ? hi : mr);

export const NOTICE_TEMPLATES = [
  {
    id: 'water', label: { mr: 'पाणीपुरवठा बंद', hi: 'पानी सप्लाई बंद', en: 'Water supply off' },
    fields: [
      { k: 'date', mr: 'दिनांक', hi: 'तारीख', en: 'Date', type: 'date' },
      { k: 'from', mr: 'पासून (वेळ)', hi: 'से (समय)', en: 'From (time)', ph: { mr: 'सकाळी १०', hi: 'सुबह 10', en: '10 AM' } },
      { k: 'to', mr: 'पर्यंत (वेळ)', hi: 'तक (समय)', en: 'To (time)', ph: { mr: 'दुपारी ४', hi: 'दोपहर 4', en: '4 PM' } },
      { k: 'reason', mr: 'कारण', hi: 'कारण', en: 'Reason', ph: { mr: 'पाण्याच्या टाकीची साफसफाई', hi: 'पानी की टंकी की सफ़ाई', en: 'water tank cleaning' } }
    ],
    build: (f, L, d) => pick(L,
      { heading: 'सूचना', body: `सर्व सभासदांना कळविण्यात येते की, ${d(f.date)} रोजी ${f.reason || 'देखभालीच्या कामा'}मुळे ${f.from || '…'} ते ${f.to || '…'} या वेळेत पाणीपुरवठा बंद राहील.\nकृपया आदल्या दिवशी पुरेसे पाणी साठवून ठेवावे.\nसहकार्याबद्दल धन्यवाद.` },
      { heading: 'सूचना', body: `सभी सदस्यों को सूचित किया जाता है कि ${d(f.date)} को ${f.reason || 'रखरखाव के काम'} के कारण ${f.from || '…'} से ${f.to || '…'} तक पानी की सप्लाई बंद रहेगी।\nकृपया एक दिन पहले पर्याप्त पानी भरकर रखें।\nसहयोग के लिए धन्यवाद।` },
      { heading: 'Notice', body: `All members are informed that on ${d(f.date)}, the water supply will remain off from ${f.from || '…'} to ${f.to || '…'} due to ${f.reason || 'maintenance work'}.\nPlease store enough water the previous day.\nThank you for your cooperation.` })
  },
  {
    id: 'meeting', label: { mr: 'सभेची सूचना', hi: 'सभा की सूचना', en: 'Meeting notice' },
    fields: [
      { k: 'kind', mr: 'सभेचा प्रकार', hi: 'सभा का प्रकार', en: 'Meeting type', options: { mr: ['वार्षिक सर्वसाधारण सभा', 'विशेष सर्वसाधारण सभा', 'व्यवस्थापकीय समिती सभा'], hi: ['वार्षिक आम सभा', 'विशेष आम सभा', 'प्रबंध समिति सभा'], en: ['Annual General Meeting', 'Special General Meeting', 'Managing Committee Meeting'] } },
      { k: 'date', mr: 'दिनांक', hi: 'तारीख', en: 'Date', type: 'date' },
      { k: 'time', mr: 'वेळ', hi: 'समय', en: 'Time', ph: { mr: 'सायंकाळी ७', hi: 'शाम 7', en: '7 PM' } },
      { k: 'place', mr: 'ठिकाण', hi: 'स्थान', en: 'Place', ph: { mr: 'संस्थेचे कार्यालय', hi: 'सोसायटी कार्यालय', en: 'society office' } },
      { k: 'agenda', mr: 'विषय (प्रत्येक नवीन ओळीत)', hi: 'विषय (हर एक नई लाइन में)', en: 'Agenda (one per line)', type: 'textarea' }
    ],
    build: (f, L, d) => {
      const items = (f.agenda || '').split('\n').map(s => s.trim()).filter(Boolean).map((s, i) => `${i + 1}. ${s}`).join('\n');
      return pick(L,
        { heading: 'सूचना', body: `सर्व सभासदांना कळविण्यात येते की, संस्थेची ${f.kind || 'सभा'} ${d(f.date)} रोजी ${f.time || '…'} वाजता ${f.place || '…'} येथे आयोजित करण्यात आली आहे.${items ? `\nसभेपुढील विषय:\n${items}` : ''}\nसर्व सभासदांनी वेळेवर उपस्थित राहावे ही विनंती.` },
        { heading: 'सूचना', body: `सभी सदस्यों को सूचित किया जाता है कि सोसायटी की ${f.kind || 'सभा'} ${d(f.date)} को ${f.time || '…'} बजे ${f.place || '…'} में आयोजित की गई है।${items ? `\nसभा के विषय:\n${items}` : ''}\nसभी सदस्यों से समय पर उपस्थित रहने का अनुरोध है।` },
        { heading: `Notice of ${f.kind || 'Meeting'}`, body: `All members are informed that the society's ${f.kind || 'meeting'} will be held on ${d(f.date)} at ${f.time || '…'} at ${f.place || '…'}.${items ? `\nAgenda:\n${items}` : ''}\nAll members are requested to attend on time.` });
    }
  },
  {
    id: 'dues', label: { mr: 'देखभाल शुल्क स्मरण', hi: 'मेंटेनेंस रिमाइंडर', en: 'Maintenance reminder' },
    fields: [
      { k: 'month', mr: 'महिना', hi: 'महीना', en: 'Month', ph: { mr: 'नोव्हेंबर २०२६', hi: 'नवंबर 2026', en: 'November 2026' } },
      { k: 'amount', mr: 'रक्कम (₹)', hi: 'राशि (₹)', en: 'Amount (₹)', type: 'number' },
      { k: 'last', mr: 'शेवटची तारीख', hi: 'अंतिम तारीख', en: 'Last date', type: 'date' }
    ],
    build: (f, L, d) => pick(L,
      { heading: 'सूचना', body: `सर्व सभासदांना कळविण्यात येते की, ${f.month || '…'} महिन्याचे देखभाल शुल्क ₹${f.amount || '…'} दि. ${d(f.last)} पर्यंत भरावे.\nशुल्क Sachiv ॲपमधून UPI द्वारे किंवा संस्थेच्या खात्यात भरता येईल.\nउशिरा भरल्यास संस्थेच्या उपविधीनुसार व्याज आकारले जाऊ शकते.` },
      { heading: 'सूचना', body: `सभी सदस्यों को सूचित किया जाता है कि ${f.month || '…'} का मेंटेनेंस शुल्क ₹${f.amount || '…'} दिनांक ${d(f.last)} तक जमा करें।\nशुल्क Sachiv ऐप से UPI द्वारा या सोसायटी के खाते में जमा किया जा सकता है।\nदेर से भुगतान पर सोसायटी के उपनियमों के अनुसार ब्याज लग सकता है।` },
      { heading: 'Notice', body: `All members are informed that the maintenance charges of ₹${f.amount || '…'} for ${f.month || '…'} must be paid by ${d(f.last)}.\nYou can pay by UPI in the Sachiv app or into the society account.\nLate payment may attract interest as per the society bye-laws.` })
  },
  {
    id: 'work', label: { mr: 'दुरुस्ती / काम', hi: 'मरम्मत / काम', en: 'Repair / work' },
    fields: [
      { k: 'work', mr: 'काम', hi: 'काम', en: 'Work', ph: { mr: 'लिफ्टची दुरुस्ती', hi: 'लिफ्ट की मरम्मत', en: 'lift repair' } },
      { k: 'date', mr: 'दिनांक', hi: 'तारीख', en: 'Date', type: 'date' },
      { k: 'note', mr: 'सभासदांसाठी सूचना', hi: 'सदस्यों के लिए सूचना', en: 'Note for members', ph: { mr: 'त्या दिवशी लिफ्ट बंद राहील', hi: 'उस दिन लिफ्ट बंद रहेगी', en: 'the lift will be closed that day' } }
    ],
    build: (f, L, d) => pick(L,
      { heading: 'सूचना', body: `सर्व सभासदांना कळविण्यात येते की, ${d(f.date)} रोजी ${f.work || '…'} करण्यात येणार आहे.${f.note ? `\n${f.note}.` : ''}\nहोणाऱ्या गैरसोयीबद्दल क्षमस्व. सहकार्याबद्दल धन्यवाद.` },
      { heading: 'सूचना', body: `सभी सदस्यों को सूचित किया जाता है कि ${d(f.date)} को ${f.work || '…'} किया जाएगा।${f.note ? `\n${f.note}।` : ''}\nअसुविधा के लिए खेद है। सहयोग के लिए धन्यवाद।` },
      { heading: 'Notice', body: `All members are informed that ${f.work || '…'} will be carried out on ${d(f.date)}.${f.note ? `\nPlease note: ${f.note}.` : ''}\nWe regret the inconvenience and thank you for your cooperation.` })
  },
  {
    id: 'general', label: { mr: 'सामान्य सूचना', hi: 'सामान्य सूचना', en: 'General notice' },
    fields: [{ k: 'text', mr: 'मजकूर', hi: 'मैटर', en: 'Text', type: 'textarea' }],
    build: (f, L) => pick(L,
      { heading: 'सूचना', body: 'सर्व सभासदांना कळविण्यात येते की, ' + (f.text || '…') },
      { heading: 'सूचना', body: 'सभी सदस्यों को सूचित किया जाता है कि ' + (f.text || '…') },
      { heading: 'Notice', body: 'All members are informed that ' + (f.text || '…') })
  }
];

export const MINUTES_TYPES = {
  mr: ['व्यवस्थापकीय समितीच्या सभेचे इतिवृत्त', 'वार्षिक सर्वसाधारण सभेचे इतिवृत्त', 'विशेष सर्वसाधारण सभेचे इतिवृत्त'],
  hi: ['प्रबंध समिति की सभा का कार्यवृत्त', 'वार्षिक आम सभा का कार्यवृत्त', 'विशेष आम सभा का कार्यवृत्त'],
  en: ['Minutes of the Managing Committee Meeting', 'Minutes of the Annual General Meeting', 'Minutes of the Special General Meeting']
};
export const RESOLUTION_PHRASES = {
  mr: ['… करण्याचे सर्वानुमते ठरले.', '… यांचे दरपत्रक सर्वानुमते मंजूर करण्यात आले.', '… याची नोंद घेण्यात आली.', '… पुढील सभेत चर्चेसाठी ठेवण्याचे ठरले.'],
  hi: ['सर्वसम्मति से … करने का निर्णय लिया गया।', '… का कोटेशन सर्वसम्मति से मंज़ूर किया गया।', '… को नोट किया गया।', '… को अगली सभा में चर्चा के लिए रखने का निर्णय लिया गया।'],
  en: ['It was unanimously resolved to …', 'The quotation of … was unanimously approved.', 'It was noted that …', 'It was decided to take up … at the next meeting.']
};
