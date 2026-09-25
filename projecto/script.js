
fetch('data.json')
  .then(response => response.json()) 
  .then(data => {                    
    console.log("Datos cargados:", data);
    iniciarPartida(data.preguntes);
  });

function iniciarPartida(preguntes) {
  console.log("Empezamos con", preguntes.length, "preguntas");

}