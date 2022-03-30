export default function SASM(codeText, readIn, writeOut, onCompile){
  let output = {};

  let validTokens = {
    testEqual:[/^(TEQ)\b/i],
    testNotEqual:[/^(TNE)\b/i],
    testGreater:[/^(TGT)\b/i],
    testGreaterEqual:[/^(TGE)\b/i],
    testLess:[/^(TLT)\b/i],
    testLessEqual:[/^(TLE)\b/i],
    testEqualString:[/^(TEQS)\b/i],
    testNotEqualString:[/^(TNES)\b/i],
    testGreaterString:[/^(TGTS)\b/i],
    testGreaterEqualString:[/^(TGES)\b/i],
    testLessString:[/^(TLTS)\b/i],
    testLessEqualString:[/^(TLES)\b/i],
    testNumber:[/^(TNUM)\b/i],
    castNumber:[/^(NUM)\b/i],
    castString:[/^(STR)\b/i],
    jump:[/^(JUMP)\b/i,/^(JMP)\b/i],
    jumpRelative:[/^(JRL)\b/i, /^(JREL)\b/i],
    jumpToSubroutine:[/^(JSR)\b/i],
    returnFromSubroutine:[/^(RSR)\b/i,/^(RET)\b/i],
    concat:[/^(CAT)\b/i],
    slice:[/^(SLC)\b/i],
    add:[/^(ADD)\b/i],
    subtract:[/^(SUB)\b/i],
    multiply:[/^(MULT)\b/i,/^(MUL)\b/i],
    divide:[/^(DIV)\b/i],
    mod:[/^(MOD)\b/i],
    move:[/^(MOV)\b/i, /^(MOVE)\b/i],
    power:[/^(POW)\b/i,/^(POWER)\b/i],
    log:[/^(LOG)\b/i],
    floor:[/^(FLR)\b/i,/^(FLOOR)\b/i],
    ceil:[/^(CEIL)\b/i],
    min:[/^(MIN)\b/i],
    max:[/^(MAX)\b/i],
    length:[/^(LEN)\b/i],
    random:[/^(RAND)\b/i],
    accumulator:[/^(ACC)\b/i],
    r0:[/^(R0)\b/i],
    r1:[/^(R1)\b/i],
    r2:[/^(R2)\b/i],
    r3:[/^(R3)\b/i],
    r4:[/^(R4)\b/i],
    r5:[/^(R5)\b/i],
    r6:[/^(R6)\b/i],
    r7:[/^(R7)\b/i],
    r8:[/^(R8)\b/i],
    r9:[/^(R9)\b/i],
    push:[/^(PUSH)\b/i, /^(PSH)\b/i],
    pop:[/^(POP)\b/i],
    top:[/^(TOP)\b/i],
    void:[/^(VOID)\b/i],
    memory:[/^(MEM)\b/i],
    address:[/^(ADDR)\b/i],
    input:[/^(IN)\b/i],
    output:[/^(OUT)\b/i],
    string:[/^"(|(?:.*?[^\\]))"/i,/^'(|(?:.*?[^\\]))'/i],
    number:[/^(-?\d+\.?\d*)/i],
    label:[/^(@[A-Za-z0-9_]+)\s*$/i],
    whitespace:[/^(\s)/i]
  }

  //program state
  let state = {
    registers:{
      ACC:0, 
      R0:0, 
      R1:0, 
      R2:0, 
      R3:0, 
      R4:0, 
      R5:0, 
      R6:0, 
      R7:0, 
      R8:0, 
      R9:0
    },
    memory:{
      STACK:[],
      RAM:[],
      ADDR:0
    },
    execution:{
      PC:0,
      STACK:[],
      LABELS:{},
      STATUS:"READY"
    }
  }
  state.code = tokenize(codeText);
  output.state = state;
  output.step = step;
  onCompile(output);

  function step(callback){
    let onExecution = function(x){
      state.execution.PC=(state.execution.PC+1)%state.code.length;
      advanceToNextInstruction();
      callback(x);
    }
    if(state.execution.STATUS === "READY"){
      executeLine(state.code[state.execution.PC], onExecution);
      
    }
    else{
      callback(-1);
    }
  }

  function advanceToNextInstruction(){
    let searchCount = 0
    while(["skip","label"].includes(state.code[state.execution.PC][0].type) && searchCount <= state.code.length){
      state.execution.PC=(state.execution.PC+1)%state.code.length;
      searchCount++;
    }
  }

  //Takes a string, and turns it into parseable tokens
  function tokenize(codeText){
    let lines = codeText.split("\n");

    //remove comments
    for(let i = 0; i < lines.length; i++){
      lines[i] = lines[i].replace(/\/\/.*/, "");
    }

    let tokens = Object.entries(validTokens);
    let code = new Array(lines.length);

    for(let i = 0; i < lines.length; i++){
      code[i] = [];
      while(lines[i].length > 0){
        let length = lines[i].length;
        for(let j = 0; j < tokens.length && lines[i].length > 0; j++){
          for(let k = 0; k < tokens[j][1].length; k++){
            let match = lines[i].match(tokens[j][1][k]);
            if(!match || lines[i].indexOf(match[0])!==0) continue;
            if(tokens[j][0] !== "whitespace") code[i].push({ type:tokens[j][0], value:match[1], line:i });
            lines[i] = lines[i].slice(match[0].length);
            break;
          }
        }
        if(lines[i].length === length) throw new Error("Unexpected token on line " + i + ": " + lines[i].split(' ')[0]);
      }
      for(let j = 0; j < code[i].length; j++){
        if(!["string"].includes(code[i][j].type)){
          code[i][j].value = code[i][j].value.toUpperCase();
        }
      }
      if(code[i].length===0){
        code[i][0] = { type:"skip", value:"", line:i }
      }
      else if(code[i][0].type==="label"){
        state.execution.LABELS[code[i][0].value] = i;
      }
    }

    return code;
  }

  /*
    Expects an array of tokens that represent one line
  */
  function executeLine(line, callback){
    try {
      switch(line[0].type){
        case "testEqual":
          testEqual(line[1], line[2], callback);
          break;
        case "testNotEqual":
          testNotEqual(line[1], line[2], callback);
          break;
        case "testGreater":
          testGreater(line[1], line[2], callback);
          break;
        case "testGreaterEqual":
          testGreaterEqual(line[1], line[2], callback);
          break;
        case "testLess":
          testLess(line[1], line[2], callback);
          break;
        case "testLessEqual":
          testLessEqual(line[1], line[2], callback);
          break;
        case "testEqualString":
          testEqualString(line[1],line[2],callback);
          break;
        case "testNotEqualString":
          testNotEqualString(line[1],line[2],callback);
          break;
        case "testGreaterString":
          testGreaterString(line[1],line[2],callback);
          break;
        case "testGreaterEqualString":
          testGreaterEqualString(line[1],line[2],callback);
          break;
        case "testLessString":
          testLessString(line[1],line[2],callback);
          break;
        case "testLessEqualString":
          testLessEqualString(line[1],line[2],callback);
          break;
        case "testNumber":
          testNumber(line[1], callback);
          break;
        case "castNumber":
          castNumber(line[1], callback);
          break;
        case "castString":
          castString(line[1], callback);
          break;
        case "jump":
          jump(line[1], callback);
          break;
        case "jumpRelative":
          jumpRelative(line[1], callback);
          break;
        case "jumpToSubroutine":
          jumpToSubroutine(line[1], callback);
          break;
        case "returnFromSubroutine":
          returnFromSubroutine(callback);
          break;
        case "concat":
          concat(line[1], line[2], callback);
          break;
        case "slice":
          slice(line[1], line[2], callback);
          break;
        case "add":
          add(line[1], line[2], callback);
          break;
        case "subtract":
          subtract(line[1], line[2], callback);
          break;
        case "multiply":
          multiply(line[1], line[2], callback);
          break;
        case "divide":
          divide(line[1], line[2], callback);
          break;
        case "mod":
          modulus(line[1], line[2], callback);
          break;
        case "power":
          power(line[1], line[2], callback);
          break;
        case "log":
          log(line[1], callback);
          break;
        case "min":
          min(line[1], line[2], callback);
          break;
        case "max":
          max(line[1], line[2], callback);
          break;
        case "length":
          length(line[1], callback);
          break;
        case "ceil":
          ceil(line[1], callback);
          break;
        case "floor":
          floor(line[1], callback);
          break;
        case "move":
          move(line[1],line[2], callback);
          break;
        case "label":
        case "skip":
        case "noop":
          callback(1);
          break;
        default:
          throw new Error("Unknown instruction: "+line[0].value);
      }
    }
    catch(e){
      throw new Error("ERROR ON LINE " + state.execution.PC + ": " + e.toString());
    }
  }

  function testEqual(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        if(a!==b){
          state.execution.PC++;
        }
        callback(1);
      }
      readNumber(tokenB, onRead2);
    }
    readNumber(tokenA,onRead1);
  }

  function testNotEqual(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        if(a===b){
          state.execution.PC++;
        }
        callback(1);
      }
      readNumber(tokenB, onRead2);
    }
    readNumber(tokenA,onRead1);
  }

  function testGreater(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        if(a<=b){
          state.execution.PC++;
        }
        callback(1);
      }
      readNumber(tokenB, onRead2);
    }
    readNumber(tokenA,onRead1);
  }

  function testGreaterEqual(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        if(a<b){
          state.execution.PC++;
        }
        callback(1);
      }
      readNumber(tokenB, onRead2);
    }
    readNumber(tokenA,onRead1);
  }

  function testLess(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        if(a>=b){
          state.execution.PC++;
        }
        callback(1);
      }
      readNumber(tokenB, onRead2);
    }
    readNumber(tokenA,onRead1);
  }

  function testLessEqual(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        if(a>b){
          state.execution.PC++;
        }
        callback(1);
      }
      readNumber(tokenB, onRead2);
    }
    readNumber(tokenA,onRead1);
  }

  function testEqualString(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        if(a!==b){
          state.execution.PC++;
        }
        callback(1);
      }
      read(tokenB, onRead2);
    }
    read(tokenA,onRead1);
  }

  function testNotEqualString(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        if(a===b){
          state.execution.PC++;
        }
        callback(1);
      }
      read(tokenB, onRead2);
    }
    read(tokenA,onRead1);
  }

  function testGreaterString(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        if(a<=b){
          state.execution.PC++;
        }
        callback(1);
      }
      read(tokenB, onRead2);
    }
    read(tokenA,onRead1);
  }

  function testGreaterEqualString(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        if(a<b){
          state.execution.PC++;
        }
        callback(1);
      }
      read(tokenB, onRead2);
    }
    read(tokenA,onRead1);
  }

  function testLessString(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        if(a>=b){
          state.execution.PC++;
        }
        callback(1);
      }
      read(tokenB, onRead2);
    }
    read(tokenA,onRead1);
  }

  function testLessEqualString(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        if(a>b){
          state.execution.PC++;
        }
        callback(1);
      }
      read(tokenB, onRead2);
    }
    read(tokenA,onRead1);
  }

  function testNumber(token, callback){
    let onRead = function(value){
      let output = parseFloat(value);
      if(isNaN(output)){
        state.execution.PC++;
      } 
      callback(1);
    }
    read(token, onRead);
  }

  function castNumber(token, callback){
    let onRead = function(value){
      state.registers.ACC = value;
      callback(1);
    }
    readNumber(token, onRead);
  }

  function castString(token, callback){
    let onRead = function(value){
      state.registers.ACC = ""+value;
      callback(1);
    }
    read(token, onRead);
  }

  function jump(token, callback){
    switch(token.type){
      case "label":
        state.execution.PC = state.execution.LABELS[token.value];
        callback(1);
        break;
      default:
        readNumber(token,(x)=>{
          state.execution.PC = Math.floor(x) - 1;
          callback(1);
        });
    }
  }

  function jumpRelative(token, callback){
    readNumber(token,(x)=>{
      state.execution.PC = state.execution.PC + Math.floor(x) - 1;
      callback(1);
    });
  }

  function jumpToSubroutine(token, callback){
    switch(token.type){
      case "label":
        state.execution.STACK.push(state.execution.PC);
        state.execution.PC = state.execution.LABELS[token.value];
        callback(1);
        break;
      default:
        readNumber(token,(x)=>{
          state.execution.STACK.push(state.execution.PC);
          state.execution.PC = Math.floor(x)-1;
          callback(1);
        });
    }
  }

  function returnFromSubroutine(callback){
    state.execution.PC = state.execution.STACK.pop();
    callback(1);
  }

  function concat(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        state.registers.ACC = a.toString() + b.toString();
        callback(1);
      }
      read(tokenB, onRead2);
    }
    read(tokenA,onRead1);
  }

  function slice(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        state.registers.ACC = state.registers.ACC.toString().slice(a, b);
        callback(1);
      }
      readNumber(tokenB, onRead2);
    }
    readNumber(tokenA,onRead1);
  }

  function add(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        state.registers.ACC = a + b;
        callback(1);
      }
      readNumber(tokenB, onRead2);
    }
    readNumber(tokenA,onRead1);
  }

  function subtract(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        state.registers.ACC = a - b;
        callback(1);
      }
      readNumber(tokenB, onRead2);
    }
    readNumber(tokenA,onRead1);
  }

  function multiply(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        state.registers.ACC = a * b;
        callback(1);
      }
      readNumber(tokenB, onRead2);
    }
    readNumber(tokenA,onRead1);
  }

  function divide(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        state.registers.ACC = a / b;
        callback(1);
      }
      readNumber(tokenB, onRead2);
    }
    readNumber(tokenA,onRead1);
  }
  function modulus(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        state.registers.ACC = a % b;
        callback(1);
      }
      readNumber(tokenB, onRead2);
    }
    readNumber(tokenA,onRead1);
  }
  function power(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        state.registers.ACC = Math.pow(a, b);
        callback(1);
      }
      readNumber(tokenB, onRead2);
    }
    readNumber(tokenA,onRead1);
  }
  function log(token, callback){
    let onRead = function(value){
      state.registers.ACC = Math.log(value);
      callback(1);
    }
    readNumber(token, onRead);
  }
  function floor(token, callback){
    let onRead = function(value){
      state.registers.ACC = Math.floor(value);
      callback(1);
    }
    readNumber(token, onRead);
  }

  function ceil(token, callback){
    let onRead = function(value){
      state.registers.ACC = Math.ceil(value);
      callback(1);
    }
    readNumber(token, onRead);
  }

  function min(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        state.registers.ACC = Math.min(a, b);
        callback(1);
      }
      readNumber(tokenB, onRead2);
    }
    readNumber(tokenA,onRead1);
  }

  function max(tokenA, tokenB, callback){
    let onRead1 = function(a){
      let onRead2 = function(b){
        state.registers.ACC = Math.max(a, b);
        callback(1);
      }
      readNumber(tokenB, onRead2);
    }
    readNumber(tokenA,onRead1);
  }

  function length(token, callback){
    let onRead = function(a){
      state.registers.ACC = (""+a).length;
      callback(1);
    }
    read(token, onRead);
  }

  function move(srcToken, destToken, callback){
    //writeable(destToken, read(srcToken));
    let onRead = function(value){
      writeable(destToken, value);
      callback(1);
    }
    read(srcToken, onRead);
  }

  function readNumber(token, callback){
    let onRead = function(value){
      let output = parseFloat(value);
      if(isNaN(output)){
        throw new Error("TOKEN NOT A NUMBER: " + token);
      } 
      callback(output);
    }
    try{
      read(token, onRead);
    }
    catch(e){
      throw e;
    }
  }

  function read(token, callback){
    state.execution.STATUS = "WAITING";
    let resume = function(x){
      state.execution.STATUS = "READY";
      callback(x);
    }
    switch(token.type){
      case "input":
        readIn(resume);
        break;
      case "random":
        resume(Math.random());
        break;
      case "accumulator":
        resume(state.registers.ACC);
        break;
      case "r0":
        resume(state.registers.R0);
        break;
      case "r1":
        resume(state.registers.R1);
        break;
      case "r2":
        resume(state.registers.R2);
        break;
      case "r3":
        resume(state.registers.R3);
        break;
      case "r4":
        resume(state.registers.R4);
        break;
      case "r5":
        resume(state.registers.R5);
        break;
      case "r6":
        resume(state.registers.R6);
        break;
      case "r7":
        resume(state.registers.R7);
        break;
      case "r8":
        resume(state.registers.R8);
        break;
      case "r9":
        resume(state.registers.R9);
        break;
      case "pop":
        resume(state.memory.STACK.pop());
        break;
      case "top":
        resume(state.memory.STACK[state.memory.STACK.length-1]);
        break;
      case "memory":
        resume(state.memory.RAM[state.memory.ADDR]);
        break;
      case "address":
        resume(state.memory.ADDR);
        break;
      case "string":
      case "number":
        resume(token.value);
        break;
      default:
        throw new Error("INVALID DATA SOURCE: " + token);
    }
  }

  function writeable(token, value){
    switch(token.type){
      case "output":
        writeOut(value);
        break;
      case "accumulator":
        state.registers.ACC = value;
        break;
      case "r0":
        state.registers.R0 = value;
        break;
      case "r1":
        state.registers.R1 = value;
        break;
      case "r2":
        state.registers.R2 = value;
        break;
      case "r3":
        state.registers.R3 = value;
        break;
      case "r4":
        state.registers.R4 = value;
        break;
      case "r5":
        state.registers.R5 = value;
        break;
      case "r6":
        state.registers.R6 = value;
        break;
      case "r7":
        state.registers.R7 = value;
        break;
      case "r8":
        state.registers.R8 = value;
        break;
      case "r9":
        state.registers.R9 = value;
        break;
      case "push":
        state.memory.STACK.push(value);
        break;
      case "void":
        break;
      case "memory":
        state.memory.RAM[state.memory.ADDR] = value;
        break;
      case "address":
        let newAddr = parseInt(value, 10);
        if(isNaN(newAddr)){
          throw new Error("ADDR EXPECTS INTEGER. " + value + " IS NOT AN INTEGER.");
        }
        state.memory.ADDR = newAddr;
        break;
      default:
        throw new Error("INVALID DATA DESTINATION: " + token.value);
    }
  }
}
