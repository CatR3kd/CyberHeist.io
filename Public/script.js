(() => {	
	socket = io();

  var menusOpen = 1;
  var lastUpdate;
	var no_scrolling = document.body;
	var spinner = document.getElementById('spinner');
  no_scrolling.style.overflowY = "hidden";
	no_scrolling.style.overflowX = "hidden";
	spinner.style.display = "none";
  
  // Console Warning
  
  console.log('%cWARNING!','color: red; font-size: 50px');
  console.log('%cDo NOT use console hacks! Do NOT tamper with scripts! It will be detected and your account will be immediately suspended!','color: red; font-size: 20px');
  
  // Socket Events
  
  socket.on('disconnect', function(){
    //window.location.reload();
  });

  socket.on('kick', function(){
    window.location.reload();
  });
  
  socket.on('loggedIn', function (res){
		hideLoader();
    console.log(res)
    if(res.error == true){
      document.getElementById('loginWarning').innerText = res.message;
      if(res.message == 'User is suspended!'){
        document.getElementById('loginWarning').innerHTML = `<p>${res.message} <a href="https://cyberheistio-dev.catr3kd.repl.co/Singleplayer/">Play singleplayer</a></p>`;
      }
    } else {
      setUp(res.message);
      console.log('data interval started');
      updateInterval = setInterval(updateData, 15000);
    }
  });
  
  socket.on('signedUp', function (res){
		hideLoader();
		
    if(res.error == true){
      document.getElementById('signupWarning').innerText = res.message;
    } else {
      setUp(res.message);
      console.log('data interval started');
      updateInterval = setInterval(updateData, 15000);
    }
  });
  
  socket.on('leaderboardUpdate', function (newLeaderboard){
    console.log(`New leaderboard: ${newLeaderboard}`);
    leaderboard = newLeaderboard;
    updateLeaderboard();
  });
  
  socket.on('updatedStats', function (newStats){
    console.log(`${getFormattedDate()} Update game:`, newStats);
    updateGame(newStats);
    saveNotification();
  });
  
  socket.on('suspended', function (res){
    document.getElementById('suspended').style.visibility = 'visible';
    clearInterval(autoInterval);
    clearInterval(updateInterval);
    clearInterval(textInterval);
  });
  
  socket.on('hacked', function (res){
    hackCode = res.code;
    openHackWarning(res.value);
  });

  socket.on('lostHack', function (value){
    money -= value;
    closeHackWarning();
    clearInterval(timer);
  });
  
  socket.on('usersOnline', function (usernames){
    const places = document.getElementById('playersOnline').getElementsByTagName('li');
    for(let place in places){
      places[place].innerText = usernames[place];
    }
  });
  
  socket.on('hackReturn', function (res){
    if(res.error == true){
      clearInterval(textInterval);
      document.getElementById('terminal').value = res.message;
    } else {
      document.getElementById('terminal').value = `hack successful, $${formatNumber(res.message)} recieved`;
      money += res.message;
      updateScreen();
    }
  });

  socket.on('chat', function(msgObj) {
    newChat(msgObj);
  });
  
  // Game Setup
  
  function setUp(userObj){

    username = userObj.username;
    
    const stats = {
      'money': userObj.gameStats.money,
      'mpc': userObj.gameStats.mpc,
      'auto' : userObj.gameStats.auto,
      'triple' : userObj.gameStats.triple,
      'superAuto' : userObj.gameStats.superAuto,
      'speed': userObj.gameStats.speed,
      'reset': userObj.gameStats.reset,
      'otherUpgrades': userObj.gameStats.otherUpgrades
    }
    
    updateGame(stats);
    hideMenu();
    menusOpen--;
  }
  
  function updateGame(stats){
    money = stats.money;
    mpc = stats.mpc;
    auto = stats.auto;
    triple = stats.triple;
    superAuto = stats.superAuto;
    speed = stats.speed;
    reset = stats.reset;
    otherUpgrades = stats.otherUpgrades;
    clearInterval(autoInterval);
    autoInterval = setInterval(autoClick, (1000 / speed.multiplier));
    if(speed.unlocked == true){
      document.getElementById('speed').disabled = true;
      document.getElementById('speed').innerText = 'Double Clicker Speed - Unlocked';
    }
    lastUpdate = stats;
    updateScreen();
  }
  
  function hideMenu(){
    document.getElementById('menuShadow').style.visibility = 'hidden';
    document.getElementById('loginContainer').style.visibility = 'hidden';
    document.getElementById('playSingleplayer').style.visibility = 'hidden';
  }

  // Settings

  if(localStorage.getItem('fastLocalLeaderboard') == null) localStorage.setItem('fastLocalLeaderboard', true);
  document.getElementById('fastLeaderBoardToggle').checked = JSON.parse(localStorage.getItem('fastLocalLeaderboard'));

  if(localStorage.getItem('freezeBG') == null) localStorage.setItem('freezeBG', false);
  document.getElementById('freezeBG').checked = JSON.parse(localStorage.getItem('freezeBG'));
  console.log(localStorage)
  if (JSON.parse(localStorage.getItem('freezeBG')) == true){
    document.body.style.animationPlayState = 'paused';
  } else {
   document.body.style.animationPlayState = 'running';
  }
  
  // Game
  
  var username;
  var money;
  var mpc;
  var auto;
  var triple;
  var superAuto;
  var speed;
  var reset;
  var otherUpgrades;
  var leaderboard = [];
  var hackCode;
	
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
      autoInterval = setInterval(autoClick, (1000 / speed.multiplier));
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
      superAuto.cost = 10000;
      superAuto.value = 0;
      reset.minCost = (reset.minCost * 10);
      updateScreen();
    }
  }

  function buyHigherHackAmount(){
    if(otherUpgrades.higherHackAmount == true) return;
    
    if(money >= 1000000){
      money -= 1000000;
      otherUpgrades.higherHackAmount = true;
      updateScreen();
    }
  }

  function buyBetterFirewall(){
    if(otherUpgrades.betterFirewall == true) return;
    
    if(money >= 1000000){
      money -= 1000000;
      otherUpgrades.betterFirewall = true;
      updateScreen();
    }
  }

  function buyCovertHacks(){
    if(otherUpgrades.covertHacks == true) return;
    
    if(money >= 1000000){
      money -= 1000000;
      otherUpgrades.covertHacks = true;
      updateScreen();
    }
  }

  function buyDoubleHacks(){
    if(otherUpgrades.doubleHacks == true) return;
    
    if(money >= 10000000){
      money -= 10000000;
      otherUpgrades.doubleHacks = true;
      updateScreen();
    }
  }
  
  // Autoclickers
  
  function autoClick(){
    money += (auto.amount + (triple.amount * 3) + (superAuto.amount * mpc.amount));
    updateScreen();
  }
  
  // Intervals
  
  var autoInterval;
  var updateInterval;
  var textInterval;
  
  // Game Updates
  
  function updateData(){
    if(username){
      const userObj = {
        'oldStats': lastUpdate,
        'username': username,
        'gameStats': {
          'money': money,
          'mpc': mpc,
          'auto': auto,
          'triple': triple,
          'superAuto': superAuto,
          'speed': speed,
          'reset': reset,
          'otherUpgrades': otherUpgrades
        }
      }
      socket.emit('userData', userObj);
    }
  }
  
  // Leaderboard
  
  function updateLeaderboard(){
    if(!isIterable(leaderboard)) return;
    
    const places = document.getElementById('leaderboard').getElementsByTagName('li');
    
    for(let place in places){
      const player = leaderboard[place];
      if(player){
        places[place].innerText = `${player.username}: $${formatNumber(player.money)}`;
      }
    }
  }

  function isIterable(input) {  
    if (input === null || input === undefined) {
      return false
    }
  
    return typeof input[Symbol.iterator] === 'function'
  }

  function localLeaderboardUpdate(){
    for (let player of leaderboard){
      if(player.username == username) player.money = money;
    }

    leaderboard.sort(function(a, b) {
      return(b.money - a.money);
    });

    updateLeaderboard();
  }

  // Chat

  function sendChat(){
    if(!username) return;
    
    const message = document.getElementById('chatMessage').value;

    if ((message.length > 500) || (message.length < 1)) return;

    socket.emit('chat', {"username": username, "message": message});
    document.getElementById('chatMessage').value = '';
  }

  function newChat(msgObj){
    const sender = msgObj.sender;
    const badgeColor = msgObj.badgeColor;
    
    const messages = document.getElementById('chat').children;

    if(document.getElementById('chat').offsetHeight > 150){
      (messages[0]).remove();
    }

    let li = document.createElement('li')
    let badge = document.createElement('span')
    let msg = document.createElement('msg')

    
    badge.innerText = `${sender}: `;
    badge.style.color = msgObj.badgeColor;

    msg.innerText = msgObj.message;
    li.appendChild(badge);
    li.appendChild(msg);

    document.getElementById('chat').appendChild(li);
  }

  // Misc

  function saveNotification(){
    document.getElementById('saveNotification').style.opacity = 1;
    setTimeout(function(){
      document.getElementById('saveNotification').style.opacity = 0;
    }, 1500);
  }

  function showLoader() {
		spinner.style.display = "block"
		document.getElementById("login").style.display = "none";
		document.getElementById("signup").style.display = "none";
		document.getElementById("divide").style.display = "none";
	}

	function hideLoader() {
		spinner.style.display = "none"
		document.getElementById("login").style.display = "block";
		document.getElementById("signup").style.display = "block";
		document.getElementById("divide").style.display = "block";
	}
  
  function getFormattedDate() {
    var date = new Date();
    return(date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +  date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds());
  }
  
  function formatNumber(number){
    if(number){
      return(number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','));
    } else {
      return(number);
    }
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

    if(otherUpgrades.higherHackAmount == true){
      document.getElementById('higherHackAmount').innerText = 'More Efficient Hacks - Unlocked';
      document.getElementById('higherHackAmount').disabled = true;
    }

    if(otherUpgrades.betterFirewall == true){
      document.getElementById('betterFirewall').innerText = 'Stronger Firewall - Unlocked';
      document.getElementById('betterFirewall').disabled = true;
    }

    if(otherUpgrades.covertHacks == true){
      document.getElementById('covertHacks').innerText = 'Covert Hacks - Unlocked';
      document.getElementById('covertHacks').disabled = true;
    }

    if(otherUpgrades.doubleHacks == true){
      document.getElementById('doubleHacks').innerText = 'Double Hacks - Unlocked';
      document.getElementById('doubleHacks').disabled = true;
    }

    if(JSON.parse(localStorage.getItem('fastLocalLeaderboard')) == true) localLeaderboardUpdate();
  }
  
  // Event Listeners

   window.addEventListener('offline', function(){
    window.location.reload();
  });
  
  document.getElementById('loginButton').addEventListener('click', function() {
		login();
  });
  
  document.getElementById('loginPassword').addEventListener('keyup', function(event) {
    if(event.keyCode === 13){
      event.preventDefault();
      login();
    }
  });
  
  document.getElementById('signupButton').addEventListener('click', function() {
    document.getElementById('signupWarning').innerText = signup();
	});

  document.getElementById('signupPassword').addEventListener('keyup', function(event) {
    if(event.keyCode === 13){
      event.preventDefault();
      document.getElementById('signupWarning').innerText = signup();
    }
  });
  
  document.getElementById('click').addEventListener('click', function(event) {
    // Make sure clicks are human
    if(event.isTrusted == true){
      click();
    }
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

  document.getElementById('higherHackAmount').addEventListener('click', function() {
    buyHigherHackAmount();
  });
  
  document.getElementById('betterFirewall').addEventListener('click', function() {
    buyBetterFirewall();
  });

  document.getElementById('covertHacks').addEventListener('click', function() {
    buyCovertHacks();
  });

  document.getElementById('doubleHacks').addEventListener('click', function() {
    buyDoubleHacks();
  });
  document.getElementById('cryptoMarketButton').addEventListener('click', function() {
    // No crypto yet (;
    //openCrypto();
  });
  
  document.getElementById('hackMenuButton').addEventListener('click', function() {
    openHack();
  });
  
  document.getElementById('closeHack').addEventListener('click', function() {
    closeHack();
  });
  
  document.getElementById('submitHackCode').addEventListener('click', function() {
    submitHackCode();
  });

  document.getElementById('chatButton').addEventListener('click', function() {
		sendChat();
  });

  document.getElementById('chatMessage').addEventListener('keyup', function(event) {
    if(event.keyCode === 13){
      event.preventDefault();
      sendChat();
    }
  });

  document.getElementById('settingsButton').addEventListener('click', function() {
		openSettings();
  });

  document.getElementById('closeSettingsButton').addEventListener('click', function() {
		closeSettings();
  });

  document.getElementById('freezeBG').addEventListener('change', (event) => {
    if (event.currentTarget.checked){
      document.body.style.animationPlayState = 'paused';
      localStorage.setItem('freezeBG', true);
    } else {
     document.body.style.animationPlayState = 'running';
      localStorage.setItem('freezeBG', false);
    }
  });

  document.getElementById('fastLeaderBoardToggle').addEventListener('change', (event) => {
    if (event.currentTarget.checked){
      localStorage.setItem('fastLocalLeaderboard', true);
    } else {
      localStorage.setItem('fastLocalLeaderboard', false);
    }
  });
  
  // Login/Signup
  
  function signup(){
		showLoader()
    const userObj = {
      'username': document.getElementById('signupUsername').value,
      'password': document.getElementById('signupPassword').value,
      'email': ''
    };
    
    if(userObj.username.length > 15){
			hideLoader()
      return('Username too long!');
    } else if(userObj.password.length > 25){
			hideLoader()
      return('Password too long!');
    } else if(userObj.password.length < 6){
			hideLoader()
      return('Password too short!');
    } else {
      socket.emit('signUp', userObj);
      return('');
    }
  }
  
  function login(){
		showLoader();
    const userObj = {
      'username': document.getElementById('loginUsername').value,
      'password': document.getElementById('loginPassword').value
    };

    if(!userObj.username || !userObj.password) return;
    socket.emit('login', userObj);
  }
  
  // Hacking
  
  document.getElementById('terminal').addEventListener('keyup', function(event) {
    if(event.keyCode === 13){
      event.preventDefault();
      const enteredWords = (document.getElementById('terminal').value).split(' ');
      if((enteredWords.length == 2) && ((enteredWords[0]).toLowerCase() == 'hack')){
        const hackObj = {
          'hacker': {
            'username': username
          },
          'victim': (enteredWords[1]).replace(/(\r\n|\n|\r)/gm, '')
        }
        socket.emit('hack', hackObj);
        doHackText();
      } else {
        document.getElementById('terminal').value = 'invalid command';
      }
    }
  });
  
  function doHackText(){
    const texts = ['preparing...', 'initializing...', 'connecting...', 'connection established', 'disabling firewall... (may take 0-1 minutes)'];
    var i = 0;
    
    textInterval = setInterval(function(){
      document.getElementById('terminal').value = texts[i];
      if(i >= (texts.length - 1)){
        clearInterval(textInterval);
      } else {
        i++;
      }
    }, 500);
  }
  
  function submitHackCode(){
    if(document.getElementById('hackCode').value == hackCode){
      closeHackWarning();
      clearInterval(textInterval);
      socket.emit('preventHack', hackCode);
    }
  }
  
  function openHack(){
    document.getElementById('terminal').value = '';
    document.getElementById('menuShadow').style.visibility = 'visible';
    document.getElementById('hackMenu').style.visibility = 'visible';
    socket.emit('onlineUsersRequest');
    menusOpen++;
  }
  
  function closeHack(){
    if(menusOpen <= 1) document.getElementById('menuShadow').style.visibility = 'hidden';
    document.getElementById('hackMenu').style.visibility = 'hidden'; 
    menusOpen--;
  }

  function openSettings(){
    document.getElementById('menuShadow').style.visibility = 'visible';
    document.getElementById('settings').style.visibility = 'visible';
    menusOpen++;
  }

  function closeSettings(){
    if(menusOpen <= 1) document.getElementById('menuShadow').style.visibility = 'hidden';
    document.getElementById('settings').style.visibility = 'hidden';
    menusOpen--;
  }
  
  function openHackWarning(value){
    document.getElementById('code').innerText = hackCode;
    document.getElementById('menuShadow').style.visibility = 'visible';
    document.getElementById('hacked').style.visibility = 'visible';
    menusOpen++;
    
    var seconds = 15;

    // Get correct amount of seconds
    if(otherUpgrades.betterFirewall == true) seconds = 25;
    
    var millis = 0;
    
    const timer = setInterval(function(){
      document.getElementById('timer').innerText = `${seconds}:${millis}`;
      if(millis == 0){
        if(seconds == 0){
          closeHackWarning();
          clearInterval(timer);
        } else {
          seconds--;
          millis = 99;
        }
      } else {
        millis--;
      }
    }, 10);
  }
  
  function closeHackWarning(){
    if(menusOpen <= 1) document.getElementById('menuShadow').style.visibility = 'hidden';
    document.getElementById('hacked').style.visibility = 'hidden'; 
    menusOpen--;
  }
  
  // Crypto Market
  
  function openCrypto(){
    document.getElementById('menuShadow').style.visibility = 'visible';
    document.getElementById('cryptoMenu').style.visibility = 'visible';
    menusOpen++;
  }

  // Anticheat

	var anticheatSettings = false;
	var clickTimes = [];

	socket.on('cheatDetectionSettings', function(settings) {
		anticheatSettings = settings;

    if(anticheatSettings.antiConsoleEnabled == true){
  		const devtools = {
  			isOpen: false,
  			orientation: undefined,
  		};
  
  		const threshold = 160;
  
  		const emitEvent = (isOpen, orientation) => {
  			globalThis.dispatchEvent(new globalThis.CustomEvent('devtoolschange', {
  				detail: {
  					isOpen,
  					orientation,
  				},
  			}));
  		};
  
  		const devToolsDetect = ({ emitEvents = true } = {}) => {
  			const widthThreshold = globalThis.outerWidth - globalThis.innerWidth > threshold;
  			const heightThreshold = globalThis.outerHeight - globalThis.innerHeight > threshold;
  			const orientation = widthThreshold ? 'vertical' : 'horizontal';
  
  			if (
  				!(heightThreshold && widthThreshold)
  				&& ((globalThis.Firebug && globalThis.Firebug.chrome && globalThis.Firebug.chrome.isInitialized) || widthThreshold || heightThreshold)
  			) {
  				if ((!devtools.isOpen || devtools.orientation !== orientation) && emitEvents) {
  					emitEvent(true, orientation);
  				}
  
  				devtools.isOpen = true;
  				devtools.orientation = orientation;
  			} else {
  				if (devtools.isOpen && emitEvents) {
  					emitEvent(false, undefined);
  				}
  
  				devtools.isOpen = false;
  				devtools.orientation = undefined;
  			}
  		};
  
  		devToolsDetect({ emitEvents: false });
  		setInterval(devToolsDetect, 500);
  
  		// ^^ Credit to https://github.com/sindresorhus/devtools-detect.
  
  		if (devtools.isOpen) {
  			location = "about:blank";
  		}
  
  		window.addEventListener('devtoolschange', event => {
  			if (event.detail.isOpen) {
  				location = "about:blank";
  			}
  		});
  
  		setInterval(() => {
  			if (window.hasOwnProperty('eruda')) {
  				location = "about:blank"
  			} else {
  				if (document.getElementById('eruda') || localStorage.getItem('eruda-entry-button')) location = "about:blank"
  				console.log(document.getElementById('eruda'))
  			}
  		}, 100);
    }

		// Enable autoclicker detection
		document.onclick = function(event) {
			// Save clicks

			if (anticheatSettings.autoClickerOptions.clicksToSave > 0) {
				clickTimes.push(new Date());
				if (clickTimes.length > anticheatSettings.autoClickerOptions.clicksToSave) clickTimes.shift();
			}

			// Detect nonhuman clicking
			if ((anticheatSettings.autoClickerOptions.detectNonhumanClick == true) && (event.isTrusted == false)) window.location.reload();

			// Detect click interval
			if ((anticheatSettings.autoClickerOptions.detectClickInterval.enabled == true) && (clickTimes.length == anticheatSettings.autoClickerOptions.clicksToSave)) {
				let maximumDifference = 0;
				for (let i in clickTimes) {
					if (i > 1) {
						const difference = Math.abs(clickTimes[i] - clickTimes[i - 1]);
						if (difference > maximumDifference) maximumDifference = difference;
					}
				}

				if (maximumDifference < anticheatSettings.autoClickerOptions.detectClickInterval.margin) {
					window.location.reload();
				}

			}

			// Detect fast clicking
			if ((anticheatSettings.autoClickerOptions.detectFastClicking.enabled == true) && (clickTimes.length > anticheatSettings.autoClickerOptions.clicksToSave)) {
				const secondsPassed = (clickTimes[clickTimes.length - 1] - clickTimes[0]) * 1000;
				const avgPerSecond = clickTimes.length / secondsPassed;

				if (avgPerSecond > anticheatSettings.autoClickerOptions.detectFastClicking.maximumAvgPerSecond) window.location.reload();
			}
		};
	});
})()