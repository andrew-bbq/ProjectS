// GAME STATE CONSTANTS
var GAME_STATE_MAIN_MENU = 0;
var GAME_STATE_RUNNING = 1;
var GAME_STATE_POINT_PAUSE = 2;
var GAME_STATE_MENU_PAUSE = 3;
var GAME_STATE_MENU_PAUSE_BETWEEN_POINTS = 4;
var GAME_STATE_SHOW_WINNER = 5;
var GAME_STATE_COLOR_SELECT = 6;

// MAX VELOCITY CONSTANTS
var MAX_VELOCITY_X = 18; //15 by default
var MAX_VELOCITY_Y = 25; //22 by default

// STANDARD CONSTANTS
var TWO_PI = Math.PI * 2;
var WIN_AMOUNT = 7; //7 by default

// MENU DATA
var menuDiv;
var smallMenuDiv;

var gameState;

// RENDER DATA
var ctx;
var canvas;
var viewWidth;
var viewHeight;
var courtYPix;
var pixelsPerUnitX;
var pixelsPerUnitY;
var updatesToPaint;
var skyColor;
var groundColor;
var ballColor;
var backTextColor;
var gameIntervalObject;
var endOfPointText;
var backImages = {};
var backImage;

// GAME DATA
var gameWidth, gameHeight;
var ball;
var slimeLeft;
var slimeRight;
var slimeLeftScore;
var slimeRightScore;
var slimeLeftColor = "#0f0";
var slimeRightColor = "#f00";
var updateCount; // RESET every time GAME_STATE_RUNNING is set
var leftWon;
var leftReady;
var rightReady;
var leftGames = 0;
var rightGames = 0;
var firstTo = 2;

// Objects rendered in the slime engine
// need an x and a y parameter
function newBall(radius, color) {
    return {
        radius: radius,
        color: color,
        x: 0,
        y: 0,
        velocityX: 0,
        velocityY: 0,
        rotation: 0,
        render: function () {
            var xPix = this.x * pixelsPerUnitX;
            var yPix = courtYPix - (this.y * pixelsPerUnitY);
            // Add two pixels for visuals
            var radiusPix = this.radius * pixelsPerUnitY + 2;
            ctx.fillStyle = ballColor;
            ctx.beginPath();
            ctx.arc(xPix, yPix, radiusPix, 0, TWO_PI);
            ctx.fill();
        }
    };
}

/**
 * Creates new array representing slime
 * @param {int} radius of slime
 * @param {string} color of slime
 */
function newSlime(radius, color) {
    return {
        radius: radius,
        color: color,
        x: 0,
        y: 0,
        velocityX: 0,
        velocityY: 0,
        render: function () {
            var xPix = this.x * pixelsPerUnitX;
            var yPix = courtYPix - (this.y * pixelsPerUnitY);
            var radiusPix = this.radius * pixelsPerUnitY;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(xPix, yPix, radiusPix, Math.PI, TWO_PI);
            ctx.fill();
        }
    };
}

/**
 * Update slime movement using player input
 * @param {array} slime array representing slime to update
 * @param {int} left key value to check in keysDown array
 * @param {int} right key value to check in keysDown array
 * @param {int} up key value to check in keysDown array
 * @param {int} down key value to check in keysDown array
 * @param {boolean} is2 is this the right slime?
 */
function updateSlimeVelocities(slime, left, right, up, down, is2) {
    // HORIZONTAL MOVEMENT
    if (keysDown[left]) {
        if (keysDown[right]) {
            slime.velocityX = 0;
        } else {
            slime.velocityX = -8;
        }
    } else if (keysDown[right]) {
        slime.velocityX = 8;
    } else {
        slime.velocityX = 0;
    }

    // JUMPING
    if (slime.y == 0 && keysDown[up]) {
        if (is2) {
            if (!wasPressed2[up]) {
                slime.velocityY = 35;
            }
            wasPressed2[up] = true;
        } else {
            if (!wasPressed1[up]) {
                slime.velocityY = 35;
            }
            wasPressed1[up] = true;
        }
    }

    // FAST FALLING
    if (slime.y != 0 && keysDown[down] && slime.velocityY <= 7) {
        if (is2) {
            if (!wasPressed2[down]) {
                slime.velocityY = -50
            }
            wasPressed2[down] = true;
        } else {
            if (!wasPressed1[down]) {
                slime.velocityY = -50
            }
            wasPressed1[down] = true;
        }
    }

    // reset wasPressed array
    if (!keysDown[down]) {
        is2 ? wasPressed2[down] = false : wasPressed1[down] = false;
    }
    if (!keysDown[up]) {
        is2 ? wasPressed2[up] = false : wasPressed1[up] = false;
    }
}

/**
 * Update slime velocity with gravity and position if moving out of bounds.
 * @param {array} slime representing slime to update
 * @param {int} leftLimit left bound for slime to stay within
 * @param {int} rightLimit right bound for slime to stay within
 */
function updateSlime(slime, leftLimit, rightLimit) {
    if (slime.velocityX != 0) {
        slime.x += slime.velocityX;
        if (slime.x < leftLimit) slime.x = leftLimit;
        else if (slime.x > rightLimit) slime.x = rightLimit;
    }
    if (slime.velocityY != 0 || slime.y > 0) {
        slime.velocityY -= 2;
        slime.y += slime.velocityY;
        if (slime.y < 0) {
            slime.y = 0;
            slime.velocityY = 0;
        }
    }
}

// NO IDEA WHAT THIS IS
var FUDGE = 5;
/**
 * Handle ball collision with slime
 * @param {array} slime array representing slime to handle collision for 
 */
function collisionBallSlime(slime) {
    var dx = 2 * (ball.x - slime.x);
    var dy = ball.y - slime.y;
    var dist = Math.trunc(Math.sqrt(dx * dx + dy * dy));

    var dVelocityX = ball.velocityX - slime.velocityX;
    var dVelocityY = ball.velocityY - slime.velocityY;

    if (dy > 0 && dist < ball.radius + slime.radius && dist > FUDGE) {
        var oldBall = { x: ball.x, y: ball.y, velocityX: ball.velocityX, velocityY: ball.velocityY };
        ball.x = slime.x + Math.trunc(Math.trunc((slime.radius + ball.radius) / 2) * dx / dist);
        ball.y = slime.y + Math.trunc((slime.radius + ball.radius) * dy / dist);

        var something = Math.trunc((dx * dVelocityX + dy * dVelocityY) / dist);

        if (something <= 0) {
            ball.velocityX += Math.trunc(slime.velocityX - 2 * dx * something / dist);
            ball.velocityY += Math.trunc(slime.velocityY - 2 * dy * something / dist);
            if (ball.velocityX < -MAX_VELOCITY_X) ball.velocityX = -MAX_VELOCITY_X;
            else if (ball.velocityX > MAX_VELOCITY_X) ball.velocityX = MAX_VELOCITY_X;
            if (ball.velocityY < -MAX_VELOCITY_Y) ball.velocityY = -MAX_VELOCITY_Y;
            else if (ball.velocityY > MAX_VELOCITY_Y) ball.velocityY = MAX_VELOCITY_Y;
        }
    }
}

/**
 * Updates balls velocity based on position
 * @return Boolean true if point is over false if not
 */
function updateBall() {
    ball.velocityY += -1; // gravity
    if (ball.velocityY < -MAX_VELOCITY_Y) {
        ball.velocityY = -MAX_VELOCITY_Y;
    }

    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    collisionBallSlime(slimeLeft);
    collisionBallSlime(slimeRight);

    // handle wall hits
    if (ball.x < 15) {
        ball.x = 15;
        ball.velocityX = -ball.velocityX;
    } else if (ball.x > 985) {
        ball.x = 985;
        ball.velocityX = -ball.velocityX;
    }
    // hits the post
    if (ball.x > 480 && ball.x < 520 && ball.y < 140) {
        // bounces off top of net
        if (ball.velocityY < 0 && ball.y > 130) {
            ball.velocityY *= -1;
            ball.y = 130;
        } else if (ball.x < 500) { // hits side of net
            ball.x = 480;
            ball.velocityX = ball.velocityX >= 0 ? -ball.velocityX : ball.velocityX;
        } else {
            ball.x = 520;
            ball.velocityX = ball.velocityX <= 0 ? -ball.velocityX : ball.velocityX;
        }
    }

    // Check for end of point
    if (ball.y < 0) {
        if (ball.x > 500) {
            leftWon = true;
            slimeLeftScore++;
        } else {
            leftWon = false;
            slimeRightScore++;
        }
        endPoint()
        return true;
    }
    return false;
}

/**
 * Call all update functions for frame cycle
 */
function updateFrame() {
    updateSlimeVelocities(slimeLeft, KEY_A, KEY_D, KEY_W, KEY_S, false);
    updateSlimeVelocities(slimeRight, KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN, true);

    updateSlime(slimeLeft, 50, 445);
    updateSlime(slimeRight, 555, 950);

    if (updateBall()) {
        return;
    }
}


// ------- RENDERING FUNCTIONS -------------------------------------------------------------------------------

/**
 * Render circles representing points scored
 * @param {int} score of player to render
 * @param {int} total number of games required to win
 * @param {int} initialX initial X position to start rendering from
 * @param {int} initialY level to place points on (lower for sets)
 * @param {int} xDiff space between circles
 * @param {string} color color of points to display
 */
function renderPoints(score, total, initialX, initialY, xDiff, color) {
    ctx.fillStyle = color;
    var x = initialX;
    for (var i = 0; i < score; i++) {
        ctx.beginPath();
        ctx.arc(x, initialY, 12, 0, TWO_PI);
        ctx.fill();
        x += xDiff;
    }
    ctx.strokeStyle = backTextColor;
    ctx.lineWidth = 2;
    x = initialX;
    for (var i = 0; i < total; i++) {
        ctx.beginPath();
        ctx.arc(x, initialY, 12, 0, TWO_PI);
        ctx.stroke();
        x += xDiff;
    }
}

/**
 * Render background and call renderPoints to render score
 */
function renderBackground() {
    ctx.fillStyle = skyColor;
    ctx.fillRect(0, 0, viewWidth, courtYPix);
    ctx.fillStyle = groundColor;
    ctx.fillRect(0, courtYPix, viewWidth, viewHeight - courtYPix);
    ctx.fillStyle = '#fff'
    ctx.fillRect(viewWidth / 2 - 2, 7 * viewHeight / 10, 4, viewHeight / 10 + 5);
    // render scores
    renderPoints(slimeLeftScore, WIN_AMOUNT, 30, 25, 40, '#ff0');
    renderPoints(slimeRightScore, WIN_AMOUNT, viewWidth - 30, 25, -40, '#ff0');

    // render set score
    renderPoints(leftGames, firstTo, 30, 65, 40, slimeLeftColor);
    renderPoints(rightGames, firstTo, viewWidth - 30, 65, -40, slimeRightColor);
}

// ------- GAME CODE  ------------------------------------------------------------------------------------

/**
 * Call all previous render functions, updates all frames
 */
function renderGame() {
    if (updatesToPaint == 0) {
        console.log("ERROR: render called but not ready to paint");
    } else {
        if (updatesToPaint > 1) {
            console.log("WARNING: render missed " + (updatesToPaint - 1) + " frame(s)");
        }
        renderBackground();
        ctx.fillStyle = '#000';
        ball.render();
        slimeLeft.render();
        slimeRight.render();
        updatesToPaint = 0;
    }
}

/**
 * Render end of point text
 */
function renderEndOfPoint() {
    var textWidth = ctx.measureText(endOfPointText).width;
    renderGame();
    ctx.fillStyle = '#000';
    ctx.fillText(endOfPointText,
        (viewWidth - textWidth) / 2, courtYPix + (viewHeight - courtYPix) / 2);
}

/**
 * If game is running, update frame and attempt to render
 */
function gameIteration() {
    if (gameState == GAME_STATE_RUNNING) {
        updateCount++;
        if (updatesToPaint > 0) {
            console.log("WARNING: updating frame before it was rendered");
        }
        updateFrame();
        updatesToPaint++;
        // request update if no request is pending
        if (updatesToPaint == 1) {
            requestAnimationFrame(renderGame);
        }
    }
}

/**
 * Handle restarting game
 * @param {boolean} is2 true if right slime false if left
 */
function readyUp(is2) {
    if (gameState == GAME_STATE_SHOW_WINNER) {
        if (is2) {
            rightReady = true;
        } else {
            leftReady = true;
        }
        if(leftReady && rightReady){
            leftReady = false;
            rightReady = false;
            start();
        }
    }
}


/**
 * Display winner of previous match, set new game state
 */
function endMatch() {
    gameState = GAME_STATE_SHOW_WINNER;
    clearInterval(gameIntervalObject);
    leftWon ? leftGames++ : rightGames++;
    menuDiv.innerHTML = '<div style="text-align:center;">' +
        '<h1 style="margin:50px 0 20px 0;">Player ' + (leftWon ? '1' : '2') + ' Wins!</h1>' +
        "Press 'down' to ready for next game" +
        '</div>';

    menuDiv.style.display = 'block';
    canvas.style.display = 'none';
}

/**
 * Start next point
 */
function startNextPoint() {
    initRound(leftWon);
    updatesToPaint = 0;
    updateCount = 0;
    gameState = GAME_STATE_RUNNING;
}

/**
 * Check if a player has won, update end of point text, call timeout to give time before next point starts
 */
function endPoint() {
    if (slimeLeftScore >= WIN_AMOUNT || slimeRightScore >= WIN_AMOUNT) {
        endMatch();
        return;
    }

    endOfPointText = 'Player ' + (leftWon ? '1' : '2') + ' scores!';
    gameState = GAME_STATE_POINT_PAUSE;
    requestAnimationFrame(renderEndOfPoint);

    setTimeout(function () {
        if (gameState == GAME_STATE_POINT_PAUSE) {
            startNextPoint();
        }
    }, 1000); // originally 700 milliseconds, increased to remove cheese strats
}

/**
 * Initialize round by setting object positions
 * @param {boolean} server true if left slime starts with ball, false if right
 */
function initRound(server) {
    ball.x = server ? 200 : 800;
    ball.y = 356;
    ball.velocityX = 0;
    ball.velocityY = 0;

    slimeLeft.x = 200;
    slimeLeft.y = 0;
    slimeLeft.velocityX = 0;
    slimeLeft.velocityY = 0;

    slimeRight.x = 800;
    slimeRight.y = 0;
    slimeRight.velocityX = 0;
    slimeRight.velocityY = 0;
}
/**
 * Update size of window & pixel sizing
 * @param {int} width of window
 * @param {int} height of window
 */
function updateWindowSize(width, height) {
    viewWidth = width;
    viewHeight = height;
    console.log("ViewSize x: " + width + ", y: " + height);
    pixelsPerUnitX = width / gameWidth;
    pixelsPerUnitY = height / gameHeight;
    console.log("GAMESIZE x: " + gameWidth + ", y: " + gameHeight);
    console.log("PPU      x: " + pixelsPerUnitX + ", y: " + pixelsPerUnitY);
    courtYPix = 4 * viewHeight / 5;
}

/**
 * Set view style attributes (Not sure why necessary)
 * @param {view} view 
 */
function setupView(view) {
    view.style.position = 'absolute';
    view.style.left = '0';
    view.style.top = '0';
}


/**
 * Set up canvas, slimes, etc. Will update this comment later.
 */
function bodyload() {
    var contentDiv = document.getElementById('GameContentDiv');

    // Create Render objects
    canvas = document.createElement('canvas');
    canvas.width = 750;
    canvas.height = 375;
    setupView(canvas, true);
    canvas.style.display = 'none';

    ctx = canvas.getContext("2d");
    ctx.font = "20px Georgia";

    gameWidth = 1000;
    gameHeight = 1000;

    // Setup Render Data
    updateWindowSize(canvas.width, canvas.height);
    contentDiv.appendChild(canvas);

    // Create Menu Objects
    menuDiv = document.createElement('div');
    setupView(menuDiv, false);
    menuDiv.style.width = '750px';
    menuDiv.style.height = '375px';

    menuDiv.style.background = "#ca6 url('projectS-home.jpg') no-repeat";
    contentDiv.appendChild(menuDiv);

    // Create options menu div
    smallMenuDiv = document.createElement('div');
    smallMenuDiv.style.position = 'absolute';

    // Initialize Game Data
    nextSlimeIndex = 0;
    ball = newBall(25, '#ff0');
    slimeLeft = newSlime(100, slimeLeftColor);
    slimeRight = newSlime(100, slimeRightColor);

    var background = new Image();
    background.src = 'projectS-home.jpg';
    background.onload = function () {
        backImages['main'] = this;
    }
    toInitialMenu();
}

/**
 * Update menu div's contents for main menu
 */
function toInitialMenu() {
    gameState = GAME_STATE_MAIN_MENU;
    menuDiv.style.display = 'block';
    menuDiv.innerHTML = '<div style="text-align:center;">' +
        '<image src="ProjectS.png" style="margin-top:25px;" width="500px"/>' +
        '<span onclick="start(true)" class="btn" style="font-family:Russo One; display:inline-block;margin:20px 30px 20px 30px;font-size:40px;">One Player</span>' +
        '<span onclick="start(false)" class="btn" style="font-family:Russo One; display:inline-block;margin:20px 30px 20px 30px;font-size:40px;">Two Player</span>' +
        '</div>';
}

// ------------- MENU FUNCTIONS ----------------------------------------------------------------------------

function start() {
    slimeLeftScore = 0;
    slimeRightScore = 0;

    skyColor = '#00f';
    backImage = backImages['sky'];
    backTextColor = '#000';
    groundColor = '#888';
    ballColor = '#fff';
    newGroundColor = '#ca6';

    initRound(true);

    updatesToPaint = 0;
    updateCount = 0;
    gameState = GAME_STATE_RUNNING
    renderBackground(); // clear the field
    canvas.style.display = 'block';
    menuDiv.style.display = 'none';
    gameIntervalObject = setInterval(gameIteration, 20);
}

function showOptions() {
    if (gameState == GAME_STATE_RUNNING) {
        gameState = GAME_STATE_MENU_PAUSE;
    } else if (gameState == GAME_STATE_POINT_PAUSE) {
        gameState = GAME_STATE_MENU_PAUSE_BETWEEN_POINTS;
    }
    var div = document.getElementById('OptionsDiv');
    div.style.display = 'block';
}
function hideOptions() {
    var div = document.getElementById('OptionsDiv');
    div.style.display = 'none';
    if (gameState == GAME_STATE_MENU_PAUSE) {
        updateCount = 0;
        gameState = GAME_STATE_RUNNING;
    } else if (gameState == GAME_STATE_MENU_PAUSE_BETWEEN_POINTS) {
        startNextPoint();
    }
}