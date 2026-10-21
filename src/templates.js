// Ready-made notice and minutes wording, written natively in Marathi and English.
// Each template lists its fields and builds { heading, body } from what the committee fills in.
export const NOTICE_TEMPLATES = [
  {
    id: 'water', label: { mr: 'पाणीपुरवठा बंद', en: 'Water supply off' },
    fields: [
      { k: 'date', mr: 'दिनांक', en: 'Date', type: 'date' },
      { k: 'from', mr: 'पासून (वेळ)', en: 'From (time)', ph: { mr: 'सकाळी १०', en: '10 AM' } },
      { k: 'to', mr: 'पर्यंत (वेळ)', en: 'To (time)', ph: { mr: 'दुपारी ४', en: '4 PM' } },
      { k: 'reason', mr: 'कारण', en: 'Reason', ph: { mr: 'पाण्याच्या टाकीची साफसफाई', en: 'water tank cleaning' } }
    ],
    build: (f, L, d) => L === 'mr'
      ? { heading: 'सूचना', body: `सर्व सभासदांना कळविण्यात येते की, ${d(f.date)} रोजी ${f.reason || 'देखभालीच्या कामा'}मुळे ${f.from || '…'} ते ${f.to || '…'} या वेळेत पाणीपुरवठा बंद राहील.\nकृपया आदल्या दिवशी पुरेसे पाणी साठवून ठेवावे.\nसहकार्याबद्दल धन्यवाद.` }
      : { heading: 'Notice', body: `All members are informed that on ${d(f.date)}, the water supply will remain off from ${f.from || '…'} to ${f.to || '…'} due to ${f.reason || 'maintenance work'}.\nPlease store enough water the previous day.\nThank you for your cooperation.` }
  },
  {
    id: 'meeting', label: { mr: 'सभेची सूचना', en: 'Meeting notice' },
    fields: [
      { k: 'kind', mr: 'सभेचा प्रकार', en: 'Meeting type', options: { mr: ['वार्षिक सर्वसाधारण सभा', 'विशेष सर्वसाधारण सभा', 'व्यवस्थापकीय समिती सभा'], en: ['Annual General Meeting', 'Special General Meeting', 'Managing Committee Meeting'] } },
      { k: 'date', mr: 'दिनांक', en: 'Date', type: 'date' },
      { k: 'time', mr: 'वेळ', en: 'Time', ph: { mr: 'सायंकाळी ७', en: '7 PM' } },
      { k: 'place', mr: 'ठिकाण', en: 'Place', ph: { mr: 'संस्थेचे कार्यालय', en: 'society office' } },
      { k: 'agenda', mr: 'विषय (प्रत्येक नवीन ओळीत)', en: 'Agenda (one per line)', type: 'textarea' }
    ],
    build: (f, L, d) => {
      const items = (f.agenda || '').split('\n').map(s => s.trim()).filter(Boolean).map((s, i) => `${i + 1}. ${s}`).join('\n');
      return L === 'mr'
        ? { heading: 'सूचना', body: `सर्व सभासदांना कळविण्यात येते की, संस्थेची ${f.kind || 'सभा'} ${d(f.date)} रोजी ${f.time || '…'} वाजता ${f.place || '…'} येथे आयोजित करण्यात आली आहे.${items ? `\nसभेपुढील विषय:\n${items}` : ''}\nसर्व सभासदांनी वेळेवर उपस्थित राहावे ही विनंती.` }
        : { heading: `Notice of ${f.kind || 'Meeting'}`, body: `All members are informed that the society's ${f.kind || 'meeting'} will be held on ${d(f.date)} at ${f.time || '…'} at ${f.place || '…'}.${items ? `\nAgenda:\n${items}` : ''}\nAll members are requested to attend on time.` };
    }
  },
  {
    id: 'dues', label: { mr: 'देखभाल शुल्क स्मरण', en: 'Maintenance reminder' },
    fields: [
      { k: 'month', mr: 'महिना', en: 'Month', ph: { mr: 'नोव्हेंबर २०२६', en: 'November 2026' } },
      { k: 'amount', mr: 'रक्कम (₹)', en: 'Amount (₹)', type: 'number' },
      { k: 'last', mr: 'शेवटची तारीख', en: 'Last date', type: 'date' }
    ],
    build: (f, L, d) => L === 'mr'
      ? { heading: 'सूचना', body: `सर्व सभासदांना कळविण्यात येते की, ${f.month || '…'} महिन्याचे देखभाल शुल्क ₹${f.amount || '…'} दि. ${d(f.last)} पर्यंत भरावे.\nशुल्क Sachiv ॲपमधून UPI द्वारे किंवा संस्थेच्या खात्यात भरता येईल.\nउशिरा भरल्यास संस्थेच्या उपविधीनुसार व्याज आकारले जाऊ शकते.` }
      : { heading: 'Notice', body: `All members are informed that the maintenance charges of ₹${f.amount || '…'} for ${f.month || '…'} must be paid by ${d(f.last)}.\nYou can pay by UPI in the Sachiv app or into the society account.\nLate payment may attract interest as per the society bye-laws.` }
  },
  {
    id: 'work', label: { mr: 'दुरुस्ती / काम', en: 'Repair / work' },
    fields: [
      { k: 'work', mr: 'काम', en: 'Work', ph: { mr: 'लिफ्टची दुरुस्ती', en: 'lift repair' } },
      { k: 'date', mr: 'दिनांक', en: 'Date', type: 'date' },
      { k: 'note', mr: 'सभासदांसाठी सूचना', en: 'Note for members', ph: { mr: 'त्या दिवशी लिफ्ट बंद राहील', en: 'the lift will be closed that day' } }
    ],
    build: (f, L, d) => L === 'mr'
      ? { heading: 'सूचना', body: `सर्व सभासदांना कळविण्यात येते की, ${d(f.date)} रोजी ${f.work || '…'} करण्यात येणार आहे.${f.note ? `\n${f.note}.` : ''}\nहोणाऱ्या गैरसोयीबद्दल क्षमस्व. सहकार्याबद्दल धन्यवाद.` }
      : { heading: 'Notice', body: `All members are informed that ${f.work || '…'} will be carried out on ${d(f.date)}.${f.note ? `\nPlease note: ${f.note}.` : ''}\nWe regret the inconvenience and thank you for your cooperation.` }
  },
  {
    id: 'general', label: { mr: 'सामान्य सूचना', en: 'General notice' },
    fields: [{ k: 'text', mr: 'मजकूर', en: 'Text', type: 'textarea' }],
    build: (f, L) => ({ heading: L === 'mr' ? 'सूचना' : 'Notice', body: (L === 'mr' ? 'सर्व सभासदांना कळविण्यात येते की, ' : 'All members are informed that ') + (f.text || '…') })
  }
];

export const MINUTES_TYPES = {
  mr: ['व्यवस्थापकीय समितीच्या सभेचे इतिवृत्त', 'वार्षिक सर्वसाधारण सभेचे इतिवृत्त', 'विशेष सर्वसाधारण सभेचे इतिवृत्त'],
  en: ['Minutes of the Managing Committee Meeting', 'Minutes of the Annual General Meeting', 'Minutes of the Special General Meeting']
};
export const RESOLUTION_PHRASES = {
  mr: ['… करण्याचे सर्वानुमते ठरले.', '… यांचे दरपत्रक सर्वानुमते मंजूर करण्यात आले.', '… याची नोंद घेण्यात आली.', '… पुढील सभेत चर्चेसाठी ठेवण्याचे ठरले.'],
  en: ['It was unanimously resolved to …', 'The quotation of … was unanimously approved.', 'It was noted that …', 'It was decided to take up … at the next meeting.']
};
