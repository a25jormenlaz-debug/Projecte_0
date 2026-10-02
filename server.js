const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('./db');

const app = express();
const PORT = 30600;

app.use(express.json());
app.use(express.static('public'));
app.use('/images', express.static('images'));

const sessions = new Map();

// Carpeta on es guarden les imatges pujades
fs.mkdirSync('images', { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'images'),
  filename: (req, file, cb) => {
    const extensio = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + extensio);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // màxim 2 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error("Només es permeten imatges"));
    }
  }
});

function barrejar(array) {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

async function carregarPreguntes() {
  const [files] = await pool.query(`
    SELECT q.id, q.question, q.image, a.answer, a.is_correct
    FROM questions q
    JOIN answers a ON a.question_id = q.id
    ORDER BY q.id, a.id
  `);

  // Transformar les files de la BD al format que coneix el client
  const mapa = new Map();

  for (const fila of files) {
    if (!mapa.has(fila.id)) {
      mapa.set(fila.id, {
        id: fila.id,
        question: fila.question,
        image: fila.image,
        answers: [],
        correctAnswer: null
      });
    }

    const pregunta = mapa.get(fila.id);
    if (fila.is_correct) {
      pregunta.correctAnswer = pregunta.answers.length;
    }
    pregunta.answers.push(fila.answer);
  }

  return [...mapa.values()];
}

function validarPregunta(body) {
  const { question, answers, correctAnswer } = body;

  if (typeof question !== 'string' || question.trim() === '') {
    return "Cal un enunciat (question)";
  }
  if (!Array.isArray(answers) || answers.length !== 4) {
    return "Calen exactament 4 respostes (answers)";
  }
  if (answers.some(a => typeof a !== 'string' || a.trim() === '')) {
    return "Cap resposta pot estar buida";
  }
  if (!Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) {
    return "correctAnswer ha de ser un enter entre 0 i 3";
  }
  return null;
}

// Les dades d'un formulari multipart arriben com a text: cal convertir-les
function llegirDades(req) {
  let answers = req.body.answers;
  if (typeof answers === 'string') {
    try {
      answers = JSON.parse(answers);
    } catch (e) {
      answers = null;
    }
  }

  return {
    question: req.body.question,
    answers: answers,
    correctAnswer: parseInt(req.body.correctAnswer),
    imageUrl: req.body.imageUrl
  };
}

// ---------- JOC ----------

app.get('/getPreguntes', async (req, res) => {
  try {
    const preguntes = await carregarPreguntes();
    const num = parseInt(req.query.num);

    if (isNaN(num) || num < 1 || num > preguntes.length) {
      return res.status(400).json({
        error: `El paràmetre num ha de ser un enter entre 1 i ${preguntes.length}`
      });
    }

    const seleccionades = barrejar(preguntes).slice(0, num);

    const sessionId = uuidv4();
    sessions.set(sessionId, { questions: seleccionades });

    const preguntesClient = seleccionades.map(p => ({
      id: p.id,
      question: p.question,
      answers: p.answers,
      image: p.image
    }));

    res.json({ sessionId, questions: preguntesClient });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error intern del servidor" });
  }
});

app.post('/finalitza', (req, res) => {
  const { sessionId, respostes } = req.body;

  // Validar que ens han enviat les dades
  if (typeof sessionId !== 'string' || !Array.isArray(respostes)) {
    return res.status(400).json({ error: "Calen sessionId i un array de respostes" });
  }

  // Validar que la sessió existeix
  const sessio = sessions.get(sessionId);
  if (!sessio) {
    return res.status(404).json({ error: "Sessió no trobada" });
  }

  // Validar que hi ha una resposta per cada pregunta
  if (respostes.length !== sessio.questions.length) {
    return res.status(400).json({
      error: `S'esperaven ${sessio.questions.length} respostes`
    });
  }

  // Comptar els encerts
  let correctes = 0;
  for (let i = 0; i < sessio.questions.length; i++) {
    if (respostes[i] === sessio.questions[i].correctAnswer) {
      correctes++;
    }
  }

  // La partida s'ha acabat: esborrem la sessió perquè no es pugui reutilitzar
  sessions.delete(sessionId);

  res.json({ total: sessio.questions.length, correctes });
});

// ---------- CRUD DE PREGUNTES ----------

// CONSULTAR totes les preguntes (inclou correctAnswer: és per a l'administració)
app.get('/questions', async (req, res) => {
  try {
    const preguntes = await carregarPreguntes();
    res.json(preguntes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error intern del servidor" });
  }
});

// CREAR una pregunta (amb imatge opcional)
app.post('/questions', upload.single('image'), async (req, res) => {
  const dades = llegirDades(req);
  const error = validarPregunta(dades);
  if (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error });
  }

  // Si s'ha pujat un fitxer, guardem el seu path; si no, la URL que ens passin
  const image = req.file ? '/images/' + req.file.filename : (dades.imageUrl || null);

  try {
    const [resultat] = await pool.query(
      'INSERT INTO questions (question, image) VALUES (?, ?)',
      [dades.question.trim(), image]
    );
    const idPregunta = resultat.insertId;

    for (let i = 0; i < dades.answers.length; i++) {
      await pool.query(
        'INSERT INTO answers (question_id, answer, is_correct) VALUES (?, ?, ?)',
        [idPregunta, dades.answers[i].trim(), i === dades.correctAnswer]
      );
    }

    res.status(201).json({ id: idPregunta, image });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error intern del servidor" });
  }
});

// MODIFICAR una pregunta (amb imatge opcional)
app.put('/questions/:id', upload.single('image'), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: "Id no vàlid" });
  }

  const dades = llegirDades(req);
  const error = validarPregunta(dades);
  if (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error });
  }

  // Imatge nova si s'ha pujat; si no, es manté la que ens indiquen
  const image = req.file ? '/images/' + req.file.filename : (dades.imageUrl || null);

  try {
    const [existents] = await pool.query('SELECT id FROM questions WHERE id = ?', [id]);
    if (existents.length === 0) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: "Pregunta no trobada" });
    }

    await pool.query(
      'UPDATE questions SET question = ?, image = ? WHERE id = ?',
      [dades.question.trim(), image, id]
    );

    // Esborrem les respostes velles i inserim les noves
    await pool.query('DELETE FROM answers WHERE question_id = ?', [id]);
    for (let i = 0; i < dades.answers.length; i++) {
      await pool.query(
        'INSERT INTO answers (question_id, answer, is_correct) VALUES (?, ?, ?)',
        [id, dades.answers[i].trim(), i === dades.correctAnswer]
      );
    }

    res.json({ id, image });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error intern del servidor" });
  }
});

// ELIMINAR una pregunta
app.delete('/questions/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Id no vàlid" });
  }

  try {
    const [resultat] = await pool.query('DELETE FROM questions WHERE id = ?', [id]);
    if (resultat.affectedRows === 0) {
      return res.status(404).json({ error: "Pregunta no trobada" });
    }
    res.json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error intern del servidor" });
  }
});

// ---------- GESTIÓ D'ERRORS (multer i altres) ----------

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === "Només es permeten imatges") {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Error intern del servidor" });
});

app.listen(PORT, () => {
  console.log(`Servidor escoltant al port ${PORT}`);
});