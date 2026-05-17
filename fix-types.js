const fs = require('fs');
const path = require('path');

const walk = function(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let i = 0;
    (function next() {
      let file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
};

walk('./src/app/dashboard', function(err, results) {
  if (err) throw err;
  results.filter(f => f.endsWith('.tsx') || f.endsWith('.ts')).forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace property accesses
    content = content.replace(/\.createdAt/g, '.created_at');
    content = content.replace(/\.updatedAt/g, '.updated_at');
    content = content.replace(/\.isPublished/g, '.is_published');
    content = content.replace(/\.courseId/g, '.course_id');
    
    // Remove quiz.level and quiz.timeLimit (they don't exist in Supabase schema)
    content = content.replace(/quiz\.level/g, '""');
    content = content.replace(/\{quiz\.timeLimit \? `\$\{quiz\.timeLimit\} min` : "No limit"\}/g, '"No limit"');
    content = content.replace(/<span>⏰ \{quiz\.timeLimit\} minutes<\/span>/g, '');
    
    // Fix missing is_correct in QuizCreator.tsx initialization
    content = content.replace(/\{ id: generateId\(\), text: "" \}/g, '{ id: generateId(), text: "", is_correct: false }');
    
    // Fix getIdToken destructuring
    content = content.replace(/const \{ getIdToken, user \} = useAuth\(\);/g, 'const { user } = useAuth();');
    
    // Fix quiz.questions since Supabase uses quiz.quiz_questions
    content = content.replace(/quiz\.questions/g, 'quiz.quiz_questions');
    content = content.replace(/quiz_questions\.length === 0/g, '(!quiz.quiz_questions || quiz.quiz_questions.length === 0)');
    
    fs.writeFileSync(file, content);
  });
  console.log('Done fixing types.');
});
