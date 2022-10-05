(() => {
  // Console Warning
  
  console.log('%cWARNING!','color: red; font-size: 50px');
  console.log('%cDo NOT use console hacks! Do NOT tamper with scripts! It will be detected!','color: red; font-size: 20px');

  // Variables
  var money = 0;
  var mpc = {'cost': 50, 'amount': 1, 'value': 0};
  var auto = {'cost': 200, 'amount': 0, 'value': 0};
  var triple = {'cost': 500, 'amount': 0, 'value': 0}
  var superAuto = {'cost': 10000, 'amount': 0, 'value': 0};
  var speed = {'cost': 5000000, 'unlocked': false, 'multiplier': 1};
  var reset = {'minCost': 1000000};
  // Uses a modified version of the cost calculator from cookie clicker

  if (localStorage.getItem('money') !== null) {
    money = JSON.parse(localStorage.getItem('money'));
    mpc = JSON.parse(localStorage.getItem('mpc'));
    auto = JSON.parse(localStorage.getItem('auto'));
    triple = JSON.parse(localStorage.getItem('triple'));
    superAuto = JSON.parse(localStorage.getItem('superAuto'));
    speed = JSON.parse(localStorage.getItem('speed'));
    reset = JSON.parse(localStorage.getItem('reset'));

    updateScreen();
  }
  
  function click(){
    money += mpc.amount;
    updateScreen();
  }
  
  // Upgrades
  
  function upgradeMPC(){
    if(money >= mpc.cost){
      mpc.value++;
      mpc.amount++;
      money -= mpc.cost;
      mpc.cost = Math.round(50 * (1.1 ** mpc.value));
      updateScreen();
    }
  }
  
  function buyAuto(){
    if(money >= auto.cost){
      auto.value++;
      auto.amount++;
      money -= auto.cost;
      auto.cost = Math.round(200 * (1.145 ** auto.value));
      updateScreen();
    }
  }
  
  function buyTriple(){
    if(money >= triple.cost){
      triple.value++;
      triple.amount++;
      money -= triple.cost;
      triple.cost = Math.round(500 * (1.145 ** triple.value));
      updateScreen();
    }
  }
  
  function buySuper(){
    if(money >= superAuto.cost){
      superAuto.value++;
      superAuto.amount++;
      money -= superAuto.cost;
      superAuto.cost = Math.round(10000 * (1.145 ** superAuto.value));
      updateScreen();
    }
  }
  
  function buySpeed(){
    if((money >= speed.cost) && (speed.unlocked == false)){
      speed.unlocked = true;
      speed.multiplier = 2;
      money -= speed.cost;
      clearInterval(autoInterval);
      autoInterval = setInterval(autoClick, 500);
      document.getElementById('speed').disabled = true;
      document.getElementById('speed').innerText = 'Double Clicker Speed - Unlocked';
      updateScreen();
    }
  }
  
  function resetPrices(){
    if(money >= reset.minCost){
      money = 0;
      mpc.cost = 50;
      mpc.value = 0;
      auto.cost = 200;
      auto.value = 0;
      triple.cost = 500;
      triple.value = 0;
      superAuto.cost = 100000;
      superAuto.value = 0;
      reset.minCost = (reset.minCost * 10);
      updateScreen();
    }
  }
  
  // Autoclickers
  
  function autoClick(){
    money += (auto.amount + (triple.amount * 3) + (superAuto.amount * mpc.amount));
    updateScreen();
  }
  
  // Intervals
  
  var autoInterval = setInterval(autoClick, 1000);
  
  // Misc
  
  function formatNumber(number){
    return(number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  }
  
  function updateScreen(){
    document.getElementById('money').innerText = `Money: $${formatNumber(money)}`;
    document.getElementById('moneyPerClick').innerText = `Money per Click: $${formatNumber(mpc.amount)}`;
    document.getElementById('moneyPerSecond').innerText = `Money per Second: $${formatNumber(speed.multiplier * (auto.amount + (triple.amount * 3) + (superAuto.amount * mpc.amount)))}`;
    document.getElementById('mpc').innerText = `Upgrade Money per Click - $${formatNumber(mpc.cost)}`;
    document.getElementById('auto').innerText = `Buy Autoclicker - $${formatNumber(auto.cost)}`;
    document.getElementById('triple').innerText = `Buy Tripleclicker - $${formatNumber(triple.cost)}`;
    document.getElementById('superAuto').innerText = `Buy Superclicker - $${formatNumber(superAuto.cost)}`;
    document.getElementById('reset').innerText = `Reset All Prices - ALL (> $${formatNumber(reset.minCost)})`;

    localStorage.setItem('money', JSON.stringify(money));
    localStorage.setItem('mpc', JSON.stringify(mpc));
    localStorage.setItem('auto', JSON.stringify(auto));
    localStorage.setItem('triple', JSON.stringify(triple));
    localStorage.setItem('superAuto', JSON.stringify(superAuto));
    localStorage.setItem('speed', JSON.stringify(speed));
    localStorage.setItem('reset', JSON.stringify(reset));
  }
  
  function openCrypto(){
    document.getElementById('menuShadow').style.visibility = 'visible';
    document.getElementById('cryptoMenu').style.visibility = 'visible';
  }
  
  function openHack(){
    document.getElementById('terminal').value = '';
    document.getElementById('menuShadow').style.visibility = 'visible';
    document.getElementById('hackMenu').style.visibility = 'visible';
  }
  
  // Event Listeners
  
  document.getElementById('click').addEventListener('click', function() {
    click();
  });
  
  document.getElementById('mpc').addEventListener('click', function() {
    upgradeMPC();
  });
  
  document.getElementById('auto').addEventListener('click', function() {
    buyAuto();
  });
  
  document.getElementById('triple').addEventListener('click', function() {
    buyTriple();
  });
  
  document.getElementById('superAuto').addEventListener('click', function() {
    buySuper();
  });
  
  document.getElementById('speed').addEventListener('click', function() {
    buySpeed();
  });
  
  document.getElementById('reset').addEventListener('click', function() {
    resetPrices();
  });

  // Anticheat

  var clickTimes = [];
  const anticheatSettings = {
  antiConsoleEnabled: true,
  autoClickerOptions: {
    clicksToSave: 40,
    detectNonhumanClick: true,
    detectClickInterval: {
      enabled: true,
      margin: 10
    },
    detectFastClicking: {
      enabled: true,
      maximumAvgPerSecond: 50
    }
  }
}

  function isConsoleOpen() {  
		try {
			if (eruda) return true;
		} catch {
			// Nothing?
		}
	  var startTime = new Date();
	  debugger;
	  var endTime = new Date();
	
	  return endTime - startTime > 100;
	}
  
  if(anticheatSettings.antiConsoleEnabled == true){
   setInterval(function(){
      if((isConsoleOpen() == true) && (anticheatSettings.antiConsoleEnabled == true)){
        window.location.reload();
      }
    }, 500);
  }

  document.onclick = function(event) {
    // Save clicks
    if(anticheatSettings.autoClickerOptions.clicksToSave > 0){
      clickTimes.push(new Date());
      if(clickTimes.length > anticheatSettings.autoClickerOptions.clicksToSave) clickTimes.shift();
    }
    
    // Detect nonhuman clicking
    if((anticheatSettings.autoClickerOptions.detectNonhumanClick == true) && (event.isTrusted == false)) window.location.reload();
    
    // Detect click interval
    if((anticheatSettings.autoClickerOptions.detectClickInterval.enabled == true) && (clickTimes.length == anticheatSettings.autoClickerOptions.clicksToSave)){
      let maximumDifference = 0;
      for(let i in clickTimes){
        if(i > 1){
          const difference = Math.abs(clickTimes[i] - clickTimes[i-1]);
          if(difference > maximumDifference) maximumDifference = difference;
        }
      }
          
      if(maximumDifference < anticheatSettings.autoClickerOptions.detectClickInterval.margin){
        window.location.reload();
      }
        
    }
    
    // Detect fast clicking
    if((anticheatSettings.autoClickerOptions.detectFastClicking.enabled == true) && (clickTimes.length > anticheatSettings.autoClickerOptions.clicksToSave)){
      const secondsPassed = (clickTimes[clickTimes.length - 1] - clickTimes[0]) * 1000;
      const avgPerSecond = clickTimes.length / secondsPassed;
    
      if(avgPerSecond > anticheatSettings.autoClickerOptions.detectFastClicking.maximumAvgPerSecond) window.location.reload();
    }
  };
})();