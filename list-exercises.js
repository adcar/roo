const fs = require('fs');
const path = require('path');

const exercisesPath = path.join(__dirname, 'public', 'exercises.json');

try {
  const data = fs.readFileSync(exercisesPath, 'utf8');
  const exercises = JSON.parse(data);
  
  exercises.forEach(exercise => {
    console.log(exercise.name);
  });
} catch (error) {
  console.error('Error reading exercises file:', error.message);
  process.exit(1);
}




