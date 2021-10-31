module.exports = {
  setMessage: setMessage
};

var i= 0
const RANDOMID =
[
  'a2iYSFeDJZzV',
  'LVcqlcn0aslH',
  '4lxmwIqOhOUf',
  'o5XZFPzdLYtU',
  'of9J1gpaeSie',
  's8Z5OsAatCL7',
  '1BDMyFZhMuXY',
  'uGbyRJbv4Slm',
  'HQhYrDaQGrSF',
  'h2Y6DA4fHorL',
  'jc3HPcYMctyt'
];

function getID(context, events, done)
{
	return done();
}

function setMessage(context, events, done) {
  i= i+1;
  context.vars.message = i;
  var indexsender = Math.floor(Math.random() * RANDOMID.length);
  context.vars.randomuidsender = indexsender;

  var indexreciver = Math.floor(Math.random() * RANDOMID.length);

  if(indexsender==indexreciver)
  {
  	if(indexreciver>0)
  		indexreciver=indexreciver-1;
  	else
  		indexreciver=indexreciver+1;
  }
  context.vars.randomuidreciver = RANDOMID[indexreciver];
  return done();
}