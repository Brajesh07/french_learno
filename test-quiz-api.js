const http = require('http');

http.get('http://localhost:3000/api/admin/quizzes', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.data && parsed.data.length > 0) {
        const id = parsed.data[0].id;
        console.log("Quiz ID:", id);
        http.get('http://localhost:3000/api/admin/quizzes/' + id, (res2) => {
          let data2 = '';
          res2.on('data', chunk => data2 += chunk);
          res2.on('end', () => {
            console.log(data2);
          });
        });
      } else {
        console.log("No quizzes found");
      }
    } catch(e) {
      console.log(data);
    }
  });
}).on('error', err => console.log(err.message));
