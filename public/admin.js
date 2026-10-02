let preguntes = [];

carregarPreguntes();

async function carregarPreguntes() {
  const resposta = await fetch('/questions');
  const dades = await resposta.json();

  if (!resposta.ok) {
    mostrarMissatge("Error: " + dades.error);
    return;
  }

  preguntes = dades;
  renderitzarLlista();
}

// Evita que el text de la BD s'interpreti com a HTML
function escapar(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function mostrarMissatge(text) {
  // Vermell si és un error o un avís, verd si ha anat bé
  const tipus = (text.startsWith("Error") || text.startsWith("El joc")) ? "danger" : "success";
  document.getElementById("missatge").innerHTML =
    `<div class="alert alert-${tipus}">${escapar(text)}</div>`;
}

function renderitzarLlista() {
  let html = '<div class="row g-3">';

  for (const p of preguntes) {
    html += `
      <div class="col-md-6 col-lg-4">
        <div class="card h-100">
          ${p.image ? `<img src="${escapar(p.image)}" class="card-img-top p-2" alt="Bandera" style="height: 120px; object-fit: contain;">` : ""}
          <div class="card-body">
            <h3 class="h6 card-title">${escapar(p.question)}</h3>
            <ul class="list-group list-group-flush mb-3">`;

    for (let i = 0; i < p.answers.length; i++) {
      const correcta = (i === p.correctAnswer);
      html += `<li class="list-group-item ${correcta ? "list-group-item-success" : ""}">${correcta ? "✔ " : ""}${escapar(p.answers[i])}</li>`;
    }

    html += `</ul>
            <button class="btn btn-sm btn-primary btn-editar" data-id="${p.id}">Editar</button>
            <button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${p.id}">Eliminar</button>
          </div>
        </div>
      </div>`;
  }

  html += '</div>';
  document.getElementById("llista").innerHTML = html;
}

// Delegació d'esdeveniments: un sol listener per a Editar i Eliminar
document.getElementById("llista").addEventListener("click", function (event) {
  const id = Number(event.target.dataset.id);

  if (event.target.classList.contains("btn-editar")) {
    omplirFormulari(id);
  }
  if (event.target.classList.contains("btn-eliminar")) {
    eliminarPregunta(id);
  }
});

function omplirFormulari(id) {
  const p = preguntes.find(pregunta => pregunta.id === id);

  document.getElementById("titolForm").textContent = "Modificar pregunta " + id;
  document.getElementById("idPregunta").value = p.id;
  document.getElementById("imatgeActual").value = p.image || "";
  document.getElementById("question").value = p.question;

  const camps = document.querySelectorAll(".resposta");
  const radios = document.querySelectorAll('input[name="correcta"]');
  for (let i = 0; i < 4; i++) {
    camps[i].value = p.answers[i];
    radios[i].checked = (i === p.correctAnswer);
  }

  document.getElementById("imatgePrevia").innerHTML =
    p.image ? `<img src="${escapar(p.image)}" alt="Imatge actual" width="100">` : "";
  document.getElementById("imatge").value = "";
  window.scrollTo(0, 0);
}

function netejarFormulari() {
  document.getElementById("formPregunta").reset();
  document.getElementById("titolForm").textContent = "Nova pregunta";
  document.getElementById("idPregunta").value = "";
  document.getElementById("imatgeActual").value = "";
  document.getElementById("imatgePrevia").innerHTML = "";
}

document.getElementById("btnCancelar").addEventListener("click", netejarFormulari);

// Crear o modificar (segons si hi ha id al camp ocult)
document.getElementById("formPregunta").addEventListener("submit", async function (event) {
  event.preventDefault();

  const id = document.getElementById("idPregunta").value;
  const respostes = [...document.querySelectorAll(".resposta")].map(camp => camp.value);
  const correcta = document.querySelector('input[name="correcta"]:checked').value;

  // FormData és el que permet enviar text i fitxer junts (multipart/form-data)
  const dades = new FormData();
  dades.append("question", document.getElementById("question").value);
  dades.append("answers", JSON.stringify(respostes));
  dades.append("correctAnswer", correcta);
  dades.append("imageUrl", document.getElementById("imatgeActual").value);

  const fitxer = document.getElementById("imatge").files[0];
  if (fitxer) {
    dades.append("image", fitxer);
  }

  const url = id ? `/questions/${id}` : '/questions';
  const metode = id ? 'PUT' : 'POST';

  // No cal posar Content-Type: el navegador el posa sol amb FormData
  const resposta = await fetch(url, { method: metode, body: dades });
  const resultat = await resposta.json();

  if (!resposta.ok) {
    mostrarMissatge("Error: " + resultat.error);
    return;
  }

  mostrarMissatge(id ? "Pregunta modificada!" : "Pregunta creada!");
  netejarFormulari();
  carregarPreguntes();
});

async function eliminarPregunta(id) {
  // El joc demana 10 preguntes: no deixem baixar d'aquí
  if (preguntes.length <= 10) {
    mostrarMissatge("El joc necessita almenys 10 preguntes, no se'n pot eliminar cap més.");
    return;
  }

  if (!confirm("Segur que vols eliminar aquesta pregunta?")) {
    return;
  }

  const resposta = await fetch(`/questions/${id}`, { method: 'DELETE' });
  const resultat = await resposta.json();

  if (!resposta.ok) {
    mostrarMissatge("Error: " + resultat.error);
    return;
  }

  mostrarMissatge("Pregunta eliminada!");
  carregarPreguntes();
}