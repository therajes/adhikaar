export type Language = 'en' | 'hi'
const copy = {
  en: {
    receiverEyebrow: 'Signed-in citizen safety check', receiverTitle: 'Know what is safe to do',
    receiverIntro: 'Use this while speaking to an employee. The check takes less than a minute.', privacyTitle: 'Your privacy', privacyBody: 'Your code stays on this device.',
    challengeTitle: 'Create your private check code', challengeHelp: 'Read this code to the employee. Their proof must include the same code.',
    privateCode: 'YOUR PRIVATE CHECK CODE', copy: 'Copy', employeeProofTitle: 'Ask the employee for their proof code', employeeProofHelp: 'It has six characters and expires after 90 seconds.',
    codeLabel: 'Verification code from employee', verify: 'Check what they are allowed to ask', regenerate: 'Create a new check code',
    resultPlaceholderTitle: 'Your answer will appear here', resultPlaceholderBody: 'We will clearly tell you whether the person is verified and whether their request is allowed.',
    scanTitle: 'Scan the employee’s QR code', scanHelp: 'Camera access is used only to read this code. Nothing is uploaded.', close: 'Close', manualFallback: 'Camera unavailable? Enter the six-character code instead.',
    safe: 'Never share an OTP, PIN, password or CVV. Use the verified callback below if anything feels wrong.'
  },
  hi: {
    receiverEyebrow: 'साइन-इन नागरिक सुरक्षा जाँच', receiverTitle: 'जानें कि क्या करना सुरक्षित है',
    receiverIntro: 'कर्मचारी से बात करते समय इसका उपयोग करें। जाँच में एक मिनट से भी कम समय लगता है।', privacyTitle: 'आपकी गोपनीयता', privacyBody: 'आपका कोड इसी डिवाइस पर रहता है।',
    challengeTitle: 'अपना निजी जाँच कोड बनाएँ', challengeHelp: 'यह कोड कर्मचारी को बताएँ। उनके प्रमाण में यही कोड होना चाहिए।',
    privateCode: 'आपका निजी जाँच कोड', copy: 'कॉपी करें', employeeProofTitle: 'कर्मचारी से उनका प्रमाण कोड माँगें', employeeProofHelp: 'यह छह अक्षरों का है और 90 सेकंड में समाप्त हो जाता है।',
    codeLabel: 'कर्मचारी से मिला सत्यापन कोड', verify: 'जाँचें कि उन्हें क्या पूछने की अनुमति है', regenerate: 'नया जाँच कोड बनाएँ',
    resultPlaceholderTitle: 'आपका उत्तर यहाँ दिखाई देगा', resultPlaceholderBody: 'हम स्पष्ट बताएँगे कि व्यक्ति सत्यापित है या नहीं और उनका अनुरोध अनुमत है या नहीं।',
    scanTitle: 'कर्मचारी का QR कोड स्कैन करें', scanHelp: 'कैमरे का उपयोग केवल कोड पढ़ने के लिए होता है। कुछ भी अपलोड नहीं किया जाता।', close: 'बंद करें', manualFallback: 'कैमरा उपलब्ध नहीं है? छह अक्षरों का कोड स्वयं दर्ज करें।',
    safe: 'OTP, PIN, पासवर्ड या CVV कभी साझा न करें। संदेह होने पर नीचे दिए सत्यापित संपर्क का उपयोग करें।'
  }
} as const
export const t = (language: Language) => copy[language]
