const express = require('express');
const { v4: uuidv4 } = require('uuid');
const preguntes = require('./data.json');

const app = express();
const PORT = 30600;

app.use(express.json());
app.use(express.static('public'));

const sessions = new Map();

function barrejar(array) {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

app.get('/getPreguntes', (req, res) => {
  const num = parseInt(req.query.num);

  // Validar el paràmetre d'entrada
  if (isNaN(num) || num < 1 || num > preguntes.length) {
    return res.status(400).json({
      error: `El paràmetre num ha de ser un enter entre 1 i ${preguntes.length}`
    });
  }

  // Barrejar i agafar les N primeres (sense repetides)
  const seleccionades = barrejar(preguntes).slice(0, num);

  // Crear la sessió i guardar-hi les preguntes (amb correctAnswer)
  const sessionId = uuidv4();
  sessions.set(sessionId, { questions: seleccionades });

  // Versió per al client: sense correctAnswer
  const preguntesClient = seleccionades.map(p => ({
    id: p.id,
    question: p.question,
    answers: p.answers,
    image: p.image
  }));

  res.json({ sessionId, questions: preguntesClient });
});

app.listen(PORT, () => {
  console.log(`Servidor escoltant al port ${PORT}`);
});