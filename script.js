(function(){
  "use strict";

  /* =====================================================
     1. CALCULATOR ENGINE — pure logic, no DOM knowledge
     ===================================================== */
  const Engine = {
    tokens: [],          // alternating: number, operator, number, operator...
    currentEntry: "",     // string being typed for the active number
    entryStarted: false,  // has the user typed into currentEntry since the last op/equals?
    justEvaluated: false, // true right after "=" was pressed
    error: null,
    lastOp: null,         // last operator token pressed, for highlighting
    MAX_DIGITS: 15,

    reset(){
      this.tokens = [];
      this.currentEntry = "";
      this.entryStarted = false;
      this.justEvaluated = false;
      this.error = null;
      this.lastOp = null;
    },

    inputDigit(d){
      if(this.error) this.reset();
      if(this.justEvaluated){
        this.tokens = [];
        this.currentEntry = "";
        this.justEvaluated = false;
      }
      if(!this.entryStarted){
        this.currentEntry = (d === "0") ? "0" : d;
        this.entryStarted = true;
      } else {
        if(this.currentEntry === "0"){
          this.currentEntry = d;
        } else if(this.currentEntry.replace(/[-.]/g,"").length < this.MAX_DIGITS){
          this.currentEntry += d;
        }
      }
      this.lastOp = null;
    },

    inputDecimal(){
      if(this.error) this.reset();
      if(this.justEvaluated){
        this.tokens = [];
        this.currentEntry = "";
        this.justEvaluated = false;
      }
      if(!this.entryStarted){
        this.currentEntry = "0.";
        this.entryStarted = true;
      } else if(this.currentEntry.indexOf(".") === -1){
        this.currentEntry += ".";
      }
      this.lastOp = null;
    },

    _pendingNumber(){
      // the number represented by currentEntry, or the previous result if none typed
      if(this.currentEntry !== ""){
        return parseFloat(this.currentEntry);
      }
      if(this.tokens.length > 0 && typeof this.tokens[this.tokens.length-1] === "number"){
        return this.tokens[this.tokens.length-1];
      }
      return 0;
    },

    inputOperator(op){
      if(this.error) this.reset();

      if(this.justEvaluated){
        // continue from the previous result
        this.justEvaluated = false;
        this.tokens = [this.tokens[this.tokens.length-1]];
        this.tokens.push(op);
        this.currentEntry = "";
        this.entryStarted = false;
        this.lastOp = op;
        return;
      }

      if(this.entryStarted || this.currentEntry !== ""){
        this.tokens.push(parseFloat(this.currentEntry));
        this.tokens.push(op);
        this.currentEntry = "";
        this.entryStarted = false;
      } else if(this.tokens.length > 0){
        // no new number typed since last operator -> swap the operator
        this.tokens[this.tokens.length - 1] = op;
      } else {
        // nothing entered yet -> treat 0 as the starting number
        this.tokens.push(0);
        this.tokens.push(op);
      }
      this.lastOp = op;
    },

    percent(){
      if(this.error) this.reset();
      const value = this._pendingNumber();
      let result;
      if(this.tokens.length >= 2 && typeof this.tokens[this.tokens.length-1] === "string"){
        const base = this.tokens[this.tokens.length - 2];
        result = (base * value) / 100;
      } else {
        result = value / 100;
      }
      this.currentEntry = String(this._trim(result));
      this.entryStarted = true;
      this.lastOp = null;
    },

    toggleSign(){
      if(this.error) this.reset();
      const value = this._pendingNumber();
      const negated = value * -1;
      this.currentEntry = String(this._trim(negated));
      this.entryStarted = true;
      this.lastOp = null;
    },

    backspace(){
      if(this.error){ this.reset(); return; }
      if(this.justEvaluated){ this.reset(); return; }
      if(this.currentEntry.length > 0){
        this.currentEntry = this.currentEntry.slice(0, -1);
        if(this.currentEntry === "-" || this.currentEntry === "") {
          this.currentEntry = "";
          this.entryStarted = false;
        }
      } else if(!this.entryStarted && this.tokens.length > 0 && typeof this.tokens[this.tokens.length-1] === "string"){
        // undo the last operator
        this.tokens.pop();
        this.lastOp = this.tokens.length ? this.tokens[this.tokens.length-1] : null;
      }
    },

    equals(){
      if(this.error){ this.reset(); return null; }
      let evalTokens = this.tokens.slice();

      if(this.entryStarted || this.currentEntry !== ""){
        evalTokens.push(parseFloat(this.currentEntry || "0"));
      }
      if(evalTokens.length === 0) return null;
      if(typeof evalTokens[evalTokens.length-1] === "string"){
        // trailing operator with nothing typed after it -> drop it
        evalTokens.pop();
      }
      if(evalTokens.length === 0) return null;

      const exprString = this._formatTokens(evalTokens);

      let value;
      try{
        value = this._evaluate(evalTokens);
      } catch(e){
        this.error = e.message || "Error";
        this.tokens = [];
        this.currentEntry = "";
        this.entryStarted = false;
        this.justEvaluated = false;
        return { error: this.error };
      }

      value = this._trim(value);
      this.tokens = [value];
      this.currentEntry = "";
      this.entryStarted = false;
      this.justEvaluated = true;
      this.lastOp = null;

      return { expression: exprString, value: value };
    },

    clear(){
      this.reset();
    },

    _trim(n){
      if(!isFinite(n)) return n;
      // mitigate floating point artifacts, keep up to 10 significant decimal places
      return Math.round((n + Number.EPSILON) * 1e10) / 1e10;
    },

    _evaluate(tokens){
      // pass 1: × and ÷ (left to right)
      let pass1 = [tokens[0]];
      for(let i = 1; i < tokens.length; i += 2){
        const op = tokens[i];
        const num = tokens[i+1];
        if(op === "×" || op === "÷"){
          const prev = pass1.pop();
          if(op === "÷"){
            if(num === 0) throw new Error("Cannot divide by zero");
            pass1.push(prev / num);
          } else {
            pass1.push(prev * num);
          }
        } else {
          pass1.push(op, num);
        }
      }
      // pass 2: + and −
      let result = pass1[0];
      for(let i = 1; i < pass1.length; i += 2){
        const op = pass1[i];
        const num = pass1[i+1];
        if(op === "+") result += num;
        else if(op === "−") result -= num;
      }
      if(!isFinite(result)) throw new Error("Number too large");
      return result;
    },

    _formatTokens(tokens){
      return tokens.map(t => typeof t === "number" ? formatNumber(t) : t).join(" ");
    },

    // Build the live display strings from current state
    getDisplayState(){
      if(this.error){
        return { expression: this._formatTokens(this.tokens), result: this.error, isError: true };
      }
      let exprParts = this.tokens.map(t => typeof t === "number" ? formatNumber(t) : t);
      let liveResult;

      if(this.currentEntry !== ""){
        liveResult = this.currentEntry.endsWith(".")
          ? formatNumber(parseFloat(this.currentEntry)) + "."
          : formatNumber(parseFloat(this.currentEntry));
        if(this.currentEntry === "-" ) liveResult = "-";
      } else if(this.tokens.length && typeof this.tokens[this.tokens.length-1] === "number"){
        liveResult = formatNumber(this.tokens[this.tokens.length-1]);
      } else {
        liveResult = "0";
      }

      // if mid-expression (ends in operator, nothing typed yet) try to preview full result
      let exprString = exprParts.join(" ");
      if(this.tokens.length >= 3 && this.currentEntry === "" && !this.justEvaluated){
        try{
          const preview = this._evaluate(this.tokens);
          liveResult = formatNumber(preview);
        }catch(e){ /* keep last number as preview on invalid intermediate state */ }
      } else if(this.tokens.length >= 2 && this.currentEntry !== ""){
        try{
          const preview = this._evaluate(this.tokens.concat([parseFloat(this.currentEntry)]));
          liveResult = formatNumber(preview);
        }catch(e){ /* ignore, e.g. divide by zero mid-typing */ }
      }

      return { expression: exprString, result: liveResult, isError: false };
    }
  };

  function formatNumber(num){
    if(num === undefined || num === null || isNaN(num)) return "0";
    if(!isFinite(num)) return "Error";
    if(Math.abs(num) >= 1e15){
      return num.toExponential(6);
    }
    const rounded = Math.round((num + Number.EPSILON) * 1e10) / 1e10;
    const negative = rounded < 0;
    const abs = Math.abs(rounded);
    let [intPart, decPart] = String(abs).split(".");
    intPart = Number(intPart).toLocaleString("en-US");
    let str = intPart + (decPart ? "." + decPart : "");
    return (negative ? "-" : "") + str;
  }

  /* =====================================================
     2. HISTORY — in-memory for this session
     (Artifacts cannot use localStorage, so history persists
      only while this page/tab stays open.)
     ===================================================== */
  const History = {
    items: [],
    add(expression, resultText){
      this.items.unshift({ expression, result: resultText });
      if(this.items.length > 50) this.items.pop();
    },
    clear(){ this.items = []; }
  };

  /* =====================================================
     3. UI — DOM rendering + event wiring
     ===================================================== */
  const el = {
    expression: document.getElementById("expression"),
    result: document.getElementById("result"),
    display: document.getElementById("display"),
    keys: document.querySelectorAll("button.key"),
    historyList: document.getElementById("historyList"),
    historyToggle: document.getElementById("historyToggle"),
    historyPanel: document.getElementById("historyPanel"),
    historyBackdrop: document.getElementById("historyBackdrop"),
    clearHistoryBtn: document.getElementById("clearHistory"),
  };

  function renderDisplay(){
    const state = Engine.getDisplayState();
    el.expression.textContent = state.expression || "\u00A0";
    el.result.textContent = state.result;
    el.result.classList.toggle("is-error", !!state.isError);
    el.display.classList.toggle("has-error", !!state.isError);
    el.expression.scrollLeft = el.expression.scrollWidth;
    el.result.scrollLeft = el.result.scrollWidth;

    document.querySelectorAll("button.key.op").forEach(btn => {
      btn.classList.toggle("selected", !state.isError && Engine.lastOp === btn.dataset.op);
    });
  }

  function renderHistory(){
    if(History.items.length === 0){
      el.historyList.innerHTML = '<div class="history-empty">No calculations yet</div>';
      return;
    }
    el.historyList.innerHTML = "";
    History.items.forEach(item => {
      const btn = document.createElement("button");
      btn.className = "history-item";
      btn.setAttribute("aria-label", `Reuse result: ${item.expression} equals ${item.result}`);
      btn.innerHTML = `<span class="h-expr">${item.expression} =</span><span class="h-result">${item.result}</span>`;
      btn.addEventListener("click", () => {
        Engine.reset();
        Engine.tokens = [parseFloat(item.result.replace(/,/g, ""))];
        Engine.justEvaluated = true;
        renderDisplay();
        closeHistoryDrawer();
      });
      el.historyList.appendChild(btn);
    });
  }

  function flashKey(selector){
    const btn = document.querySelector(selector);
    if(!btn) return;
    btn.classList.add("pressed");
    setTimeout(() => btn.classList.remove("pressed"), 140);
  }

  function handleAction(action, dataset){
    switch(action){
      case "digit":
        Engine.inputDigit(dataset.digit);
        break;
      case "decimal":
        Engine.inputDecimal();
        break;
      case "op":
        Engine.inputOperator(dataset.op);
        break;
      case "percent":
        Engine.percent();
        break;
      case "sign":
        Engine.toggleSign();
        break;
      case "clear":
        Engine.clear();
        break;
      case "equals": {
        const out = Engine.equals();
        if(out && !out.error){
          History.add(out.expression, formatNumber(out.value));
          renderHistory();
        }
        break;
      }
      default: break;
    }
    renderDisplay();
  }

  el.keys.forEach(btn => {
    btn.addEventListener("click", () => {
      handleAction(btn.dataset.action, btn.dataset);
    });
  });

  // Backspace key (⌫) isn't in the visual grid per the layout spec,
  // but keep a keyboard shortcut wired to it via the header/back action.
  document.addEventListener("keydown", (e) => {
    const key = e.key;
    let selectorToFlash = null;

    if(/^[0-9]$/.test(key)){
      Engine.inputDigit(key);
      selectorToFlash = `button.key[data-action="digit"][data-digit="${key}"]`;
    } else if(key === "."){
      Engine.inputDecimal();
      selectorToFlash = 'button.key[data-action="decimal"]';
    } else if(key === "+"){
      Engine.inputOperator("+");
      selectorToFlash = 'button.key[data-action="op"][data-op="+"]';
    } else if(key === "-"){
      Engine.inputOperator("−");
      selectorToFlash = 'button.key[data-action="op"][data-op="−"]';
    } else if(key === "*"){
      Engine.inputOperator("×");
      selectorToFlash = 'button.key[data-action="op"][data-op="×"]';
    } else if(key === "/"){
      e.preventDefault();
      Engine.inputOperator("÷");
      selectorToFlash = 'button.key[data-action="op"][data-op="÷"]';
    } else if(key === "%"){
      Engine.percent();
      selectorToFlash = 'button.key[data-action="percent"]';
    } else if(key === "Enter" || key === "="){
      e.preventDefault();
      const out = Engine.equals();
      if(out && !out.error){
        History.add(out.expression, formatNumber(out.value));
        renderHistory();
      }
      selectorToFlash = 'button.key[data-action="equals"]';
    } else if(key === "Backspace"){
      Engine.backspace();
      selectorToFlash = null;
    } else if(key === "Escape"){
      Engine.clear();
      selectorToFlash = 'button.key[data-action="clear"]';
    } else {
      return;
    }

    if(selectorToFlash) flashKey(selectorToFlash);
    renderDisplay();
  });

  // History drawer (mobile)
  function openHistoryDrawer(){
    el.historyPanel.classList.add("open");
    el.historyBackdrop.classList.add("open");
    el.historyToggle.setAttribute("aria-expanded", "true");
  }
  function closeHistoryDrawer(){
    if(window.innerWidth > 860) return;
    el.historyPanel.classList.remove("open");
    el.historyBackdrop.classList.remove("open");
    el.historyToggle.setAttribute("aria-expanded", "false");
  }
  el.historyToggle.addEventListener("click", () => {
    const isOpen = el.historyPanel.classList.contains("open");
    isOpen ? closeHistoryDrawer() : openHistoryDrawer();
  });
  el.historyBackdrop.addEventListener("click", closeHistoryDrawer);

  el.clearHistoryBtn.addEventListener("click", () => {
    History.clear();
    renderHistory();
  });

  // Initial paint
  renderDisplay();
  renderHistory();
})();
