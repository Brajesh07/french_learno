export function document() {
 const common={prompt:{en:'Choose a greeting'},instructions:{en:'Answer in French'},hints:[],media:[]};
 const feedback={correctAnswerDisplay:'Bonjour',explanation:{en:'Bonjour means hello.'}};
 return {schemaVersion:1,courseId:'21000000-0000-4000-8000-000000000001',title:'First words',description:'',objective:'Greet a friend',kind:'lesson',proficiency:'A1',accessTier:'free',passingScore:70,questions:[
 {questionId:crypto.randomUUID(),type:'multiple_choice',presentation:{...common,interaction:{options:[{id:'a',text:'Bonjour'},{id:'b',text:'Merci'}],shuffleOptions:true}},assessment:{gradingStrategy:'single_option',gradingVersion:1,maxScore:1,correctOptionId:'a'},feedback},
 {questionId:crypto.randomUUID(),type:'typed_recall',presentation:{...common,interaction:{inputLanguage:'fr-FR',maxLength:80,characterPalette:['é']}},assessment:{gradingStrategy:'accepted_text',gradingVersion:1,maxScore:1,normalizationPolicy:'fr-basic-v1',acceptedAnswers:['café']},feedback},
 {questionId:crypto.randomUUID(),type:'sentence_builder',presentation:{...common,interaction:{tokens:[{id:'a',text:'Je'},{id:'b',text:'suis'}],shuffleTokens:true,allowTokenReturn:true}},assessment:{gradingStrategy:'ordered_tokens',gradingVersion:1,maxScore:1,acceptedSequences:[['a','b']]},feedback},
 {questionId:crypto.randomUUID(),type:'listening_choice',presentation:{...common,interaction:{options:[{id:'a',text:'Bonjour'},{id:'b',text:'Merci'}],shuffleOptions:true},media:[{kind:'audio',source:'tts',text:'Bonjour',locale:'fr-FR',rate:0.78,transcript:{text:'Bonjour',reveal:'on_request'}}]},assessment:{gradingStrategy:'single_option',gradingVersion:1,maxScore:1,correctOptionId:'a'},feedback},
 ]};
}
