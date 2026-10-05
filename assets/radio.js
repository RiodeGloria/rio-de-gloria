

const radioPlayer = document.getElementById("radioPlayer");
const radioStatus = document.getElementById("radioStatus");
const radioButtons = document.querySelectorAll(".radio-control");

const radioButtonLabels=[...radioButtons].map(button=>button.innerHTML);

function setRadioButtonsPlaying(){

  radioButtons.forEach(function(button){

    if(button.classList.contains("btn-primary")){
      button.innerHTML = "Pausar Radio";
    }else{
      button.innerHTML = "Pausar Radio";
    }

  });

  radioStatus.textContent = "Reproduciendo Radio Río de Gloria";

}

function setRadioButtonsStopped(){

  radioButtons.forEach(function(button,index){

    button.innerHTML = radioButtonLabels[index];

  });

  radioStatus.textContent = "Radio detenida";

}

async function toggleRadio(){

  try{

    if(radioPlayer.paused){

      radioStatus.textContent = "Conectando con la radio...";

      await radioPlayer.play();

      setRadioButtonsPlaying();

    }else{

      radioPlayer.pause();

      setRadioButtonsStopped();

    }

  }catch(error){

    console.error(error);

    radioStatus.textContent =
      "No se pudo iniciar la radio en este navegador.";

  }

}

radioPlayer.addEventListener("playing", function(){

  setRadioButtonsPlaying();

});

radioPlayer.addEventListener("pause", function(){

  setRadioButtonsStopped();

});

radioPlayer.addEventListener("waiting", function(){

  radioStatus.textContent =
    "Conectando con la señal...";

});

radioPlayer.addEventListener("error", function(){

  radioStatus.textContent =
    "No se pudo cargar la señal de radio.";

});

