let totesLesPreguntes = [];
let preguntesPartida = [];
let intervalTemps = null;

let estatDeLaPartida = {
  contadorPreguntes: 0,
  respostesUsuari: [],
  temps: 0
};

fetch('data.json')
  .then(response => response.json())
  .then(data => {
    console.log("Dades carregades:", data);
    totesLesPreguntes = data.preguntes;
    comprovarUsuari();
  });

// Formulari del nom
document.getElementById("formNom").addEventListener("submit", function (event) {
  event.preventDefault();
  const nom = document.getElementById("inputNom").value.trim();
  if (nom !== "") {
    localStorage.setItem("nom", nom);
    mostrarSalutacio(nom);
  }
});

// Botó per esborrar el nom
document.getElementById("btnEsborrar").addEventListener("click", function () {
  localStorage.removeItem("nom");
  mostrarFormulari();
});

// Delegació d'esdeveniments a les respostes
document.getElementById("partida").addEventListener("click", function (event) {
  if (event.target.classList.contains("boto-resposta")) {
    const indexResposta = Number(event.target.dataset.index);
    respondre(indexResposta);
  }
});

function comprovarUsuari() {
  const nom = localStorage.getItem("nom");
  if (nom) {
    mostrarSalutacio(nom);
  } else {
    mostrarFormulari();
  }
}

function mostrarSalutacio(nom) {
  document.getElementById("formNom").classList.add("hidden");
  document.getElementById("salutacio").classList.remove("hidden");
  document.getElementById("joc").classList.remove("hidden");
  document.getElementById("textSalutacio").textContent = `Hola, ${nom}!`;
  iniciarPartida(totesLesPreguntes);
}

function mostrarFormulari() {
  clearInterval(intervalTemps);
  document.getElementById("formNom").classList.remove("hidden");
  document.getElementById("salutacio").classList.add("hidden");
  document.getElementById("joc").classList.add("hidden");
  document.getElementById("inputNom").value = "";
}

function iniciarPartida(preguntes) {
  preguntesPartida = preguntes;
  estatDeLaPartida.contadorPreguntes = 0;
  estatDeLaPartida.respostesUsuari = [];
  estatDeLaPartida.temps = 0;
  document.getElementById("btnEnviar").classList.add("hidden");
  renderitzarMarcador();
  renderitzarTemps();
  iniciarTemporitzador();
  mostrarPregunta();
}

function iniciarTemporitzador() {
  clearInterval(intervalTemps);
  intervalTemps = setInterval(function () {
    estatDeLaPartida.temps++;
    renderitzarTemps();
  }, 1000);
}

function mostrarPregunta() {
  const pregunta = preguntesPartida[estatDeLaPartida.contadorPreguntes];
  const divPartida = document.getElementById("partida");

  let html = `
    <h2>${pregunta.pregunta}</h2>
    <img src="${pregunta.imatge}" alt="Bandera" width="200">
    <div>
  `;

  for (let i = 0; i < pregunta.respostes.length; i++) {
    html += `<button class="boto-resposta" data-index="${i}">${pregunta.respostes[i].resposta}</button>`;
  }

  html += `</div>`;
  divPartida.innerHTML = html;
}

function respondre(indexResposta) {
  estatDeLaPartida.respostesUsuari.push(indexResposta);
  estatDeLaPartida.contadorPreguntes++;
  renderitzarMarcador();

  if (estatDeLaPartida.contadorPreguntes < preguntesPartida.length) {
    mostrarPregunta();
  } else {
    clearInterval(intervalTemps);
    document.getElementById("partida").innerHTML =
      `<p>Has respost totes les preguntes en ${estatDeLaPartida.temps} segons!</p>`;
    document.getElementById("btnEnviar").classList.remove("hidden");
  }
}

function renderitzarMarcador() {
  document.getElementById("marcador").innerHTML =
    `Preguntes respostes: ${estatDeLaPartida.contadorPreguntes} de ${preguntesPartida.length}`;
}

function renderitzarTemps() {
  document.getElementById("temps").innerHTML = `Temps: ${estatDeLaPartida.temps} s`;
}