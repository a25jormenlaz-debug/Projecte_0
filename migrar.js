const pool = require('./db');
const preguntes = require('./data.json');

async function migrar() {
  for (const p of preguntes) {
    const [resultat] = await pool.query(
      'INSERT INTO questions (question, image) VALUES (?, ?)',
      [p.question, p.image]
    );

    const idPregunta = resultat.insertId;

    for (let i = 0; i < p.answers.length; i++) {
      await pool.query(
        'INSERT INTO answers (question_id, answer, is_correct) VALUES (?, ?, ?)',
        [idPregunta, p.answers[i], i === p.correctAnswer]
      );
    }
  }

  console.log('Migració completada!');
  await pool.end();
}

migrar();