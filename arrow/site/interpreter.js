/* ============================================================================
   ASSIGNMENT ARROW - PSEUDOCODE INTERPRETER
   Lexer, parser and tree-walking evaluator for Cambridge pseudocode, covering
   both the IGCSE 0478 and AS/A Level 9618 dialects.
   Error messages are written the way a teacher would say them: the error IS
   the lesson.
   Runs in a browser (window.PseudoRun) and under Node (module.exports), so
   tools/verify.mjs can check every question and every library example.
   ========================================================================== */
(function(window){
/* ============================================================================
   PSEUDOCODE INTERPRETER
   A lexer, parser and tree-walking evaluator for the 9618 notation.
   Error messages are written the way a teacher would say them, because the
   error IS the lesson.
   ========================================================================== */
(function(){
"use strict";

function PErr(line, msg, hint){
  const e = new Error(msg);
  e.pseudo = true; e.line = line; e.hint = hint || "";
  return e;
}

/* ---------------------------------------------------------------- LEXER -- */
const KW = ["DECLARE","CONSTANT","IF","THEN","ELSE","ENDIF","CASE","OF","OTHERWISE",
  "ENDCASE","FOR","TO","STEP","NEXT","WHILE","DO","ENDWHILE","REPEAT","UNTIL",
  "PROCEDURE","ENDPROCEDURE","FUNCTION","RETURNS","RETURN","ENDFUNCTION","CALL",
  "BYVAL","BYREF","INPUT","OUTPUT","ARRAY","TYPE","ENDTYPE","CLASS","ENDCLASS",
  "INHERITS","PRIVATE","PUBLIC","NEW","SUPER","OPENFILE","READFILE","WRITEFILE",
  "CLOSEFILE","SEEK","GETRECORD","PUTRECORD","READ","WRITE","APPEND","RANDOM",
  "AND","OR","NOT","TRUE","FALSE","INTEGER","REAL","CHAR","STRING","BOOLEAN","DATE"];
const KWSET = new Set(KW);

function lex(src){
  const toks = [];
  let i = 0, line = 1;
  const push = (t,v) => toks.push({ t:t, v:v, line:line });

  while (i < src.length){
    const c = src[i];

    if (c === "\n"){ push("NL"); line++; i++; continue; }
    if (c === " " || c === "\t" || c === "\r"){ i++; continue; }

    if (c === "/" && src[i+1] === "/"){ while (i < src.length && src[i] !== "\n") i++; continue; }

    if (c === '"'){
      let j = i+1, s = "";
      while (j < src.length && src[j] !== '"'){
        if (src[j] === "\n") throw PErr(line, "A text string was opened with a double quote but never closed.", "Every \" needs a matching \" on the same line.");
        s += src[j++];
      }
      if (j >= src.length) throw PErr(line, "A text string was opened but never closed.");
      push("STR", s); i = j+1; continue;
    }
    if (c === "'"){
      let j = i+1, s = "";
      while (j < src.length && src[j] !== "'"){ s += src[j++]; }
      if (j >= src.length) throw PErr(line, "A character was opened with a single quote but never closed.");
      push("CHR", s); i = j+1; continue;
    }

    if (/[0-9]/.test(c)){
      let j = i, s = "";
      while (j < src.length && /[0-9]/.test(src[j])) s += src[j++];
      if (src[j] === "." && /[0-9]/.test(src[j+1] || "")){
        s += src[j++];
        while (j < src.length && /[0-9]/.test(src[j])) s += src[j++];
      }
      push("NUM", parseFloat(s)); i = j; continue;
    }

    if (/[A-Za-z_]/.test(c)){
      let j = i, s = "";
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) s += src[j++];
      const up = s.toUpperCase();
      if (KWSET.has(up)) push("KW", up); else push("ID", s);
      i = j; continue;
    }

    if (src.startsWith("<-", i) || c === "←"){
      push("OP", "<-"); i += (c === "←" ? 1 : 2); continue;
    }
    if (src.startsWith("<=", i)){ push("OP","<="); i += 2; continue; }
    if (src.startsWith(">=", i)){ push("OP",">="); i += 2; continue; }
    if (src.startsWith("<>", i)){ push("OP","<>"); i += 2; continue; }
    if (src.startsWith("!=", i)) throw PErr(line, "'!=' is not used in this notation.", "Not-equal is written <>");
    if ("+-*/^&=<>(),[]:.".indexOf(c) !== -1){ push("OP", c); i++; continue; }

    throw PErr(line, "I do not recognise the character '" + c + "'.");
  }
  push("NL"); push("EOF");
  /* Long expressions wrap across lines in real papers. Drop a line break
     when the expression obviously continues - the line ends with a binary
     operator, or the next line begins with one. */
  const ENDS  = ["&","+","-","*","/","^","=","<>","<","<=",">",">=",",","("];
  const STARTS= ["&","+","*","/","^",",",")"];
  const KWJOIN= ["AND","OR"];
  const joined = [];
  for (let i = 0; i < toks.length; i++){
    const t = toks[i];
    if (t.t === "NL"){
      let p = joined.length - 1;
      while (p >= 0 && joined[p].t === "NL") p--;
      const prev = p >= 0 ? joined[p] : null;
      let q = i + 1;
      while (q < toks.length && toks[q].t === "NL") q++;
      const next = q < toks.length ? toks[q] : null;
      const prevJoins = prev && ((prev.t === "OP" && ENDS.indexOf(prev.v) !== -1) ||
                                 (prev.t === "KW" && KWJOIN.indexOf(prev.v) !== -1));
      const nextJoins = next && ((next.t === "OP" && STARTS.indexOf(next.v) !== -1) ||
                                 (next.t === "KW" && KWJOIN.indexOf(next.v) !== -1));
      if (prevJoins || nextJoins) continue;
    }
    joined.push(t);
  }
  return joined;
}

/* --------------------------------------------------------------- PARSER -- */
function Parser(toks){
  this.k = toks; this.p = 0;
}
Parser.prototype = {
  peek(n){ return this.k[this.p + (n||0)]; },
  get line(){ return (this.peek() || {line:0}).line; },
  at(t,v){ const x = this.peek(); return x.t === t && (v === undefined || x.v === v); },
  atKW(v){ return this.at("KW", v); },
  next(){ return this.k[this.p++]; },
  eat(t,v){
    if (!this.at(t,v)) return null;
    return this.next();
  },
  expect(t,v,msg,hint){
    if (!this.at(t,v)) throw PErr(this.line, msg || ("Expected " + (v || t) + " here."), hint);
    return this.next();
  },
  skipNL(){ while (this.at("NL")) this.next(); },
  endLine(){
    if (this.at("NL") || this.at("EOF")) { this.eat("NL"); return; }
    throw PErr(this.line, "There is unexpected text at the end of this line.");
  },

  parseProgram(){
    const b = [];
    this.skipNL();
    while (!this.at("EOF")){
      b.push(this.statement());
      this.skipNL();
    }
    return { kind:"Block", body:b };
  },

  block(stops){
    const b = [];
    this.skipNL();
    while (!this.at("EOF")){
      const x = this.peek();
      if (x.t === "KW" && stops.indexOf(x.v) !== -1) break;
      if (stops.indexOf("__CASE__") !== -1 && this.looksLikeCaseLabel()) break;
      b.push(this.statement());
      this.skipNL();
    }
    return { kind:"Block", body:b };
  },

  looksLikeCaseLabel(){
    if (this.atKW("OTHERWISE")) return true;
    const save = this.p;
    try{
      if (!(this.at("NUM") || this.at("STR") || this.at("CHR") || this.at("ID") ||
            this.atKW("TRUE") || this.atKW("FALSE"))) { this.p = save; return false; }
      this.next();
      if (this.atKW("TO")){ this.next(); if (this.at("NUM")||this.at("CHR")||this.at("STR")) this.next(); }
      const ok = this.at("OP", ":");
      this.p = save; return ok;
    }catch(e){ this.p = save; return false; }
  },

  typeName(){
    const x = this.peek();
    if (x.t === "KW" && ["INTEGER","REAL","CHAR","STRING","BOOLEAN","DATE"].indexOf(x.v) !== -1){
      this.next(); return x.v;
    }
    if (x.t === "ID"){ this.next(); return x.v; }
    throw PErr(this.line, "A data type is needed here.",
      "Use INTEGER, REAL, CHAR, STRING, BOOLEAN, DATE, or the name of a TYPE or CLASS you defined.");
  },

  statement(){
    const x = this.peek();
    const ln = x.line;

    if (x.t === "KW"){
      switch (x.v){
        case "DECLARE":   return this.sDeclare();
        case "CONSTANT":  return this.sConstant();
        case "IF":        return this.sIf();
        case "CASE":      return this.sCase();
        case "FOR":       return this.sFor();
        case "WHILE":     return this.sWhile();
        case "REPEAT":    return this.sRepeat();
        case "PROCEDURE": return this.sProcedure();
        case "FUNCTION":  return this.sFunction();
        case "CALL":      return this.sCall();
        case "RETURN":    { this.next(); const e = this.at("NL") ? null : this.expr(); this.endLine();
                            return { kind:"Return", value:e, line:ln }; }
        case "INPUT":     return this.sInput();
        case "OUTPUT":    return this.sOutput();
        case "TYPE":      return this.sType();
        case "CLASS":     return this.sClass();
        case "OPENFILE":  return this.sOpen();
        case "READFILE":  return this.sReadFile();
        case "WRITEFILE": return this.sWriteFile();
        case "SEEK":      return this.sRecStmt("Seek");
        case "GETRECORD": return this.sRecStmt("GetRecord");
        case "PUTRECORD": return this.sRecStmt("PutRecord");
        case "CLOSEFILE": { this.next(); const f = this.expr(); this.endLine();
                            return { kind:"CloseFile", file:f, line:ln }; }
        case "ENDIF": case "ENDWHILE": case "NEXT": case "UNTIL": case "ENDCASE":
        case "ENDPROCEDURE": case "ENDFUNCTION": case "ELSE": case "ENDTYPE": case "ENDCLASS":
          throw PErr(ln, "'" + x.v + "' appears here without the statement it is meant to close.",
            "Check that every block is opened before it is closed, and that they are not crossed over.");
      }
    }

    // assignment, or the classic '=' mistake
    const target = this.expr();
    if (this.at("OP","<-")){
      this.next();
      const val = this.expr();
      this.endLine();
      return { kind:"Assign", target:target, value:val, line:ln };
    }
    // 'Count = 0' parses as a comparison, so catch it here: it is the
    // single most common pseudocode mistake there is.
    if (target.kind === "Bin" && target.op === "="){
      throw PErr(ln, "'=' cannot be used to store a value in a variable.",
        "Assignment is the arrow. Write  Name ← Value  (typing <- gives you the arrow). '=' only ever compares two things.");
    }
    if (this.at("OP","=")){
      throw PErr(ln, "'=' cannot be used to store a value in a variable.",
        "Assignment is the arrow. Write  Name ← Value  (typing <- gives you the arrow). '=' only ever compares.");
    }
    throw PErr(ln, "This line is not a statement I can carry out.",
      "Every line should start with a keyword such as OUTPUT or IF, or be an assignment using ←.");
  },

  sDeclare(){
    const ln = this.line;
    this.next();
    const names = [this.expect("ID", undefined, "DECLARE needs the name of a variable.").v];
    while (this.eat("OP", ",")) names.push(this.expect("ID", undefined, "Expected another variable name after the comma.").v);
    this.expect("OP", ":", "DECLARE needs a colon before the data type.",
      "The shape is  DECLARE Name : TYPE");

    if (this.atKW("ARRAY")){
      this.next();
      this.expect("OP","[","ARRAY needs square brackets giving its bounds.","For example ARRAY[1:30] OF INTEGER");
      const dims = [];
      for(;;){
        const lo = this.expr();
        this.expect("OP",":","An array bound needs a colon between the lower and upper value.","For example [1:30]");
        const hi = this.expr();
        dims.push([lo,hi]);
        if (this.eat("OP",",")) continue;
        break;
      }
      this.expect("OP","]","The array bounds were never closed with ].");
      this.expect("KW","OF","ARRAY bounds must be followed by OF and a data type.","For example ARRAY[1:30] OF INTEGER");
      const et = this.typeName();
      this.endLine();
      return { kind:"DeclareArray", names:names, dims:dims, elemType:et, line:ln };
    }

    const t = this.typeName();
    this.endLine();
    return { kind:"Declare", names:names, type:t, line:ln };
  },

  sConstant(){
    const ln = this.line;
    this.next();
    const name = this.expect("ID", undefined, "CONSTANT needs a name.").v;
    /* 9618 writes  CONSTANT Pi = 3.14159  ; IGCSE 0478 material commonly
       writes  CONSTANT Pi <- 3.14159 . Accept both, flag neither as an
       error - a candidate must never be blocked over this. */
    if (this.at("OP","<-") || this.at("OP","\u2190")) this.next();
    else this.expect("OP","=","A CONSTANT is given its value with = or with the arrow.",
      "For example  CONSTANT Pi = 3.14159");
    const v = this.expr();
    this.endLine();
    return { kind:"Const", name:name, value:v, line:ln };
  },

  sIf(){
    const ln = this.line;
    this.next();
    const cond = this.expr();
    if (!this.atKW("THEN")) throw PErr(ln, "This IF has no THEN.",
      "THEN goes on the same line as IF:  IF Condition THEN");
    this.next();
    this.eat("NL");
    const then = this.block(["ELSE","ENDIF"]);
    let other = null;
    if (this.atKW("ELSE")){
      this.next(); this.eat("NL");
      other = this.block(["ENDIF"]);
    }
    if (!this.atKW("ENDIF")) throw PErr(ln, "This IF was never closed with ENDIF.",
      "Every IF needs a matching ENDIF, even when there is no ELSE.");
    this.next(); this.eat("NL");
    return { kind:"If", cond:cond, then:then, other:other, line:ln };
  },

  sCase(){
    const ln = this.line;
    this.next();
    if (!this.atKW("OF")) throw PErr(ln, "CASE must be followed by OF.", "The shape is  CASE OF Variable");
    this.next();
    const subject = this.expr();
    this.eat("NL");
    const branches = [];
    let other = null;
    this.skipNL();
    while (!this.atKW("ENDCASE")){
      if (this.at("EOF")) throw PErr(ln, "This CASE OF was never closed with ENDCASE.");
      if (this.atKW("OTHERWISE")){
        this.next();
        this.expect("OP",":","OTHERWISE needs a colon after it.");
        other = this.caseBody();
        this.skipNL();
        continue;
      }
      const lo = this.expr();
      let hi = null;
      if (this.atKW("TO")){ this.next(); hi = this.expr(); }
      this.expect("OP",":","Each CASE value needs a colon after it.",
        "For example    1 : OUTPUT \"One\"");
      branches.push({ lo:lo, hi:hi, body:this.caseBody() });
      this.skipNL();
    }
    this.next(); this.eat("NL");
    return { kind:"Case", subject:subject, branches:branches, other:other, line:ln };
  },
  caseBody(){
    if (this.at("NL")){ this.eat("NL"); return this.block(["ENDCASE","OTHERWISE","__CASE__"]); }
    const s = this.statement();
    return { kind:"Block", body:[s] };
  },

  sFor(){
    const ln = this.line;
    this.next();
    const v = this.expect("ID", undefined, "FOR needs a counter variable.").v;
    if (this.at("OP","=")) throw PErr(ln, "A FOR loop sets its counter with the arrow, not with '='.",
      "Write  FOR " + v + " ← 1 TO 10");
    this.expect("OP","<-","FOR needs ← to set its starting value.","For example  FOR i ← 1 TO 10");
    const from = this.expr();
    if (!this.atKW("TO")) throw PErr(ln, "FOR needs TO and a finishing value.");
    this.next();
    const to = this.expr();
    let step = null;
    if (this.atKW("STEP")){ this.next(); step = this.expr(); }
    this.eat("NL");
    const body = this.block(["NEXT"]);
    if (!this.atKW("NEXT")) throw PErr(ln, "This FOR loop was never closed with NEXT.",
      "A FOR loop ends with NEXT followed by the same counter name.");
    const nl = this.line;
    this.next();
    let warn = null;
    if (this.at("ID")){
      const nv = this.next().v;
      if (nv.toUpperCase() !== v.toUpperCase())
        throw PErr(nl, "NEXT names '" + nv + "' but this FOR loop counts with '" + v + "'.",
          "NEXT must repeat the counter from the FOR line. Crossed-over NEXT lines are a common lost mark.");
    } else {
      warn = "Line " + nl + ": NEXT should name the counter - write  NEXT " + v;
    }
    this.eat("NL");
    return { kind:"For", v:v, from:from, to:to, step:step, body:body, line:ln, warn:warn };
  },

  sWhile(){
    const ln = this.line;
    this.next();
    const cond = this.expr();
    if (this.atKW("DO")) this.next();
    this.eat("NL");
    const body = this.block(["ENDWHILE"]);
    if (!this.atKW("ENDWHILE")) throw PErr(ln, "This WHILE loop was never closed with ENDWHILE.");
    this.next(); this.eat("NL");
    return { kind:"While", cond:cond, body:body, line:ln };
  },

  sRepeat(){
    const ln = this.line;
    this.next(); this.eat("NL");
    const body = this.block(["UNTIL"]);
    if (!this.atKW("UNTIL")) throw PErr(ln, "This REPEAT was never closed with UNTIL.");
    this.next();
    const cond = this.expr();
    this.endLine();
    return { kind:"Repeat", body:body, cond:cond, line:ln };
  },

  params(){
    const ps = [];
    this.expect("OP","(","A subroutine name must be followed by brackets, even when there are no parameters.");
    if (this.eat("OP",")")) return ps;
    for(;;){
      this.skipNL();
      let mode = "BYVAL";
      if (this.atKW("BYVAL")){ this.next(); }
      else if (this.atKW("BYREF")){ this.next(); mode = "BYREF"; }
      const n = this.expect("ID", undefined, "Expected a parameter name.").v;
      let t = null;
      if (this.eat("OP",":")) t = this.typeName();
      ps.push({ name:n, mode:mode, type:t });
      this.skipNL();
      if (this.eat("OP",",")) continue;
      break;
    }
    this.skipNL();
    this.expect("OP",")","The parameter list was never closed with ).");
    return ps;
  },

  subName(what){
    // a constructor is called NEW, which is also a keyword
    if (this.at("KW","NEW")) return this.next().v;
    return this.expect("ID", undefined, what + " needs a name.").v;
  },
  sProcedure(){
    const ln = this.line;
    this.next();
    const name = this.subName("PROCEDURE");
    const ps = this.at("OP","(") ? this.params() : [];
    this.eat("NL");
    const body = this.block(["ENDPROCEDURE"]);
    if (!this.atKW("ENDPROCEDURE")) throw PErr(ln, "Procedure '" + name + "' was never closed with ENDPROCEDURE.");
    this.next(); this.eat("NL");
    return { kind:"Proc", name:name, params:ps, body:body, line:ln };
  },

  sFunction(){
    const ln = this.line;
    this.next();
    const name = this.subName("FUNCTION");
    const ps = this.at("OP","(") ? this.params() : [];
    let rt = null;
    if (this.atKW("RETURNS")){ this.next(); rt = this.typeName(); }
    else throw PErr(ln, "Function '" + name + "' does not say what type it returns.",
      "The header must end  RETURNS TYPE  - for example  FUNCTION Area(R : REAL) RETURNS REAL");
    this.eat("NL");
    const body = this.block(["ENDFUNCTION"]);
    if (!this.atKW("ENDFUNCTION")) throw PErr(ln, "Function '" + name + "' was never closed with ENDFUNCTION.");
    this.next(); this.eat("NL");
    return { kind:"Func", name:name, params:ps, ret:rt, body:body, line:ln };
  },

  sCall(){
    const ln = this.line;
    this.next();
    const e = this.expr();
    this.endLine();
    if (e.kind !== "Call" && e.kind !== "Method")
      return { kind:"CallStmt", call:{ kind:"Call", callee:e, args:[], line:ln }, line:ln };
    return { kind:"CallStmt", call:e, line:ln };
  },

  sInput(){
    const ln = this.line;
    this.next();
    let prompt = null;
    if (this.at("STR")){ prompt = this.next().v; this.eat("OP",","); }
    const target = this.expr();
    this.endLine();
    return { kind:"Input", target:target, prompt:prompt, line:ln };
  },

  sOutput(){
    const ln = this.line;
    this.next();
    const parts = [];
    if (!this.at("NL")){
      parts.push(this.expr());
      while (this.eat("OP",",")) parts.push(this.expr());
    }
    this.endLine();
    return { kind:"Output", parts:parts, line:ln };
  },

  sType(){
    const ln = this.line;
    this.next();
    const name = this.expect("ID", undefined, "TYPE needs a name.").v;
    if (this.eat("OP","=")){
      this.expect("OP","(","An enumerated type lists its values in brackets.");
      const vals = [];
      for(;;){
        vals.push(this.expect("ID", undefined, "Expected a value name.").v);
        if (this.eat("OP",",")) continue;
        break;
      }
      this.expect("OP",")","The list of values was never closed with ).");
      this.endLine();
      return { kind:"EnumType", name:name, values:vals, line:ln };
    }
    this.eat("NL");
    const fields = [];
    this.skipNL();
    while (!this.atKW("ENDTYPE")){
      if (this.at("EOF")) throw PErr(ln, "TYPE '" + name + "' was never closed with ENDTYPE.");
      const d = this.statement();
      if (d.kind === "Declare") d.names.forEach(n => fields.push({ name:n, type:d.type }));
      else if (d.kind === "DeclareArray") d.names.forEach(n => fields.push({ name:n, arr:d }));
      else throw PErr(d.line, "Only DECLARE lines are allowed inside a TYPE definition.");
      this.skipNL();
    }
    this.next(); this.eat("NL");
    return { kind:"RecType", name:name, fields:fields, line:ln };
  },

  sClass(){
    const ln = this.line;
    this.next();
    const name = this.expect("ID", undefined, "CLASS needs a name.").v;
    let parent = null;
    if (this.atKW("INHERITS")){ this.next(); parent = this.expect("ID", undefined, "INHERITS needs the name of the parent class.").v; }
    this.eat("NL");
    const attrs = [], methods = [];
    this.skipNL();
    while (!this.atKW("ENDCLASS")){
      if (this.at("EOF")) throw PErr(ln, "CLASS '" + name + "' was never closed with ENDCLASS.");
      let vis = "PUBLIC";
      if (this.atKW("PRIVATE")){ this.next(); vis = "PRIVATE"; }
      else if (this.atKW("PUBLIC")){ this.next(); }

      if (this.atKW("PROCEDURE") || this.atKW("FUNCTION")){
        const m = this.atKW("PROCEDURE") ? this.sProcedure() : this.sFunction();
        m.vis = vis; methods.push(m);
      } else if (this.atKW("DECLARE")){
        const d = this.sDeclare();
        d.names.forEach(n => attrs.push({ name:n, type:d.type, dims:d.dims, elemType:d.elemType, vis:vis }));
      } else if (this.at("ID")){
        const n = this.next().v;
        this.expect("OP",":","A class attribute needs a colon before its data type.",
          "For example  PRIVATE Balance : REAL");
        const t = this.typeName();
        this.endLine();
        attrs.push({ name:n, type:t, vis:vis });
      } else {
        throw PErr(this.line, "Only attributes and methods are allowed inside a CLASS.");
      }
      this.skipNL();
    }
    this.next(); this.eat("NL");
    return { kind:"Class", name:name, parent:parent, attrs:attrs, methods:methods, line:ln };
  },

  /* SEEK f, address   GETRECORD f, var   PUTRECORD f, var */
  sRecStmt(kind){
    const ln = this.line;
    const word = this.next().v;
    const file = this.expr();
    if (!this.eat("OP",",")) throw PErr(ln, word + " needs a comma between the file and the " +
      (kind === "Seek" ? "address" : "variable") + ".",
      kind === "Seek" ? 'For example  SEEK "Stock.dat", 12'
                      : 'For example  ' + word + ' "Stock.dat", ThisRecord');
    const arg = this.expr();
    this.endLine();
    return { kind:kind, file:file, arg:arg, line:ln };
  },

  sOpen(){
    const ln = this.line; this.next();
    const f = this.expr();
    if (this.atKW("FOR") || (this.at("ID") && this.peek().v.toUpperCase() === "FOR")) this.next();
    const MODES = ["READ","WRITE","APPEND","RANDOM"];
    let mode = null;
    if (this.at("KW") && MODES.indexOf(this.peek().v) !== -1) mode = this.next().v;
    else if (this.at("ID") && MODES.indexOf(this.peek().v.toUpperCase()) !== -1) mode = this.next().v.toUpperCase();
    if (!mode) throw PErr(ln, "OPENFILE must say how the file is being opened.",
      'Write  OPENFILE "name.txt" FOR READ  (or FOR WRITE, FOR APPEND, FOR RANDOM).');
    this.endLine();
    return { kind:"OpenFile", file:f, mode:mode, line:ln };
  },
  sReadFile(){
    const ln = this.line; this.next();
    const f = this.expr();
    this.expect("OP",",","READFILE needs a comma between the file and the variable.",
      "For example  READFILE \"Data.txt\", Line");
    const v = this.expr();
    this.endLine();
    return { kind:"ReadFile", file:f, target:v, line:ln };
  },
  sWriteFile(){
    const ln = this.line; this.next();
    const f = this.expr();
    this.expect("OP",",","WRITEFILE needs a comma between the file and the data.");
    const v = this.expr();
    this.endLine();
    return { kind:"WriteFile", file:f, value:v, line:ln };
  },

  /* ---- expressions ---- */
  expr(){ return this.pOr(); },
  pOr(){ let l = this.pAnd(); while (this.atKW("OR")){ const ln=this.line; this.next(); l = {kind:"Bin",op:"OR",l:l,r:this.pAnd(),line:ln}; } return l; },
  pAnd(){ let l = this.pNot(); while (this.atKW("AND")){ const ln=this.line; this.next(); l = {kind:"Bin",op:"AND",l:l,r:this.pNot(),line:ln}; } return l; },
  pNot(){ if (this.atKW("NOT")){ const ln=this.line; this.next(); return {kind:"Un",op:"NOT",e:this.pNot(),line:ln}; } return this.pCmp(); },
  pCmp(){
    let l = this.pAdd();
    while (this.at("OP","=")||this.at("OP","<>")||this.at("OP","<")||this.at("OP",">")||this.at("OP","<=")||this.at("OP",">=")){
      const ln = this.line, op = this.next().v;
      l = { kind:"Bin", op:op, l:l, r:this.pAdd(), line:ln };
    }
    return l;
  },
  pAdd(){
    let l = this.pMul();
    while (this.at("OP","+")||this.at("OP","-")||this.at("OP","&")){
      const ln = this.line, op = this.next().v;
      l = { kind:"Bin", op:op, l:l, r:this.pMul(), line:ln };
    }
    return l;
  },
  pMul(){
    let l = this.pUn();
    while (this.at("OP","*")||this.at("OP","/")){
      const ln = this.line, op = this.next().v;
      l = { kind:"Bin", op:op, l:l, r:this.pUn(), line:ln };
    }
    return l;
  },
  pUn(){
    if (this.at("OP","-")){ const ln=this.line; this.next(); return {kind:"Un",op:"-",e:this.pUn(),line:ln}; }
    if (this.at("OP","+")){ this.next(); return this.pUn(); }
    return this.pPow();
  },
  pPow(){
    const b = this.pPost();
    if (this.at("OP","^")){ const ln=this.line; this.next(); return {kind:"Bin",op:"^",l:b,r:this.pUn(),line:ln}; }
    return b;
  },
  pPost(){
    let e = this.pPrim();
    for(;;){
      if (this.at("OP","[")){
        const ln = this.line; this.next();
        const idx = [this.expr()];
        while (this.eat("OP",",")) idx.push(this.expr());
        this.expect("OP","]","The array index was never closed with ].");
        e = { kind:"Index", target:e, idx:idx, line:ln };
      } else if (this.at("OP",".")){
        const ln = this.line; this.next();
        // NEW is a keyword but is also the constructor's name: SUPER.NEW(...)
        const f = this.at("KW","NEW") ? this.next().v
                : this.expect("ID", undefined, "A dot must be followed by a field or method name.").v;
        if (this.at("OP","(")){
          const args = this.args();
          e = { kind:"Method", obj:e, name:f, args:args, line:ln };
        } else {
          e = { kind:"Field", obj:e, name:f, line:ln };
        }
      } else if (this.at("OP","(")){
        const ln = this.line;
        const args = this.args();
        e = { kind:"Call", callee:e, args:args, line:ln };
      } else break;
    }
    return e;
  },
  args(){
    this.expect("OP","(");
    const a = [];
    if (this.eat("OP",")")) return a;
    for(;;){
      a.push(this.expr());
      if (this.eat("OP",",")) continue;
      break;
    }
    this.expect("OP",")","The argument list was never closed with ).");
    return a;
  },
  pPrim(){
    const x = this.peek(), ln = x.line;
    if (x.t === "NUM"){ this.next(); return { kind:"Num", v:x.v, line:ln }; }
    if (x.t === "STR"){ this.next(); return { kind:"Str", v:x.v, line:ln }; }
    if (x.t === "CHR"){ this.next(); return { kind:"Chr", v:x.v, line:ln }; }
    if (x.t === "KW" && x.v === "TRUE"){ this.next(); return { kind:"Bool", v:true, line:ln }; }
    if (x.t === "KW" && x.v === "FALSE"){ this.next(); return { kind:"Bool", v:false, line:ln }; }
    if (x.t === "KW" && x.v === "NEW"){
      this.next();
      const cn = this.expect("ID", undefined, "NEW must be followed by a class name.").v;
      const a = this.at("OP","(") ? this.args() : [];
      return { kind:"New", cls:cn, args:a, line:ln };
    }
    if (x.t === "KW" && x.v === "SUPER"){ this.next(); return { kind:"Super", line:ln }; }
    /* RANDOM is both a file-access mode keyword and an IGCSE library
       function, so accept it as a call here. */
    if (x.t === "KW" && x.v === "RANDOM"){
      this.next();
      return { kind:"Var", name:"RANDOM", line:ln };
    }
    if (x.t === "ID"){ this.next(); return { kind:"Var", name:x.v, line:ln }; }
    if (x.t === "OP" && x.v === "("){
      this.next();
      const e = this.expr();
      this.expect("OP",")","The bracket opened here was never closed.");
      return e;
    }
    if (x.t === "NL") throw PErr(ln, "This line stops before it is finished.",
      "Something is missing at the end - a value, a variable or a closing bracket.");
    throw PErr(ln, "'" + (x.v !== undefined ? x.v : x.t) + "' cannot be used as a value here.");
  }
};

window.PseudoParse = function(src){ return new Parser(lex(src)).parseProgram(); };
window.PseudoErr = PErr;
})();

/* ============================================================================
   PSEUDOCODE EVALUATOR
   ========================================================================== */
(function(){
"use strict";
const PErr = window.PseudoErr;
const MAX_STEPS = 3000000, MAX_OUT = 3000, MAX_DEPTH = 400;

const NUMTYPES = { INTEGER:1, REAL:1 };

function Scope(parent, selfObj){
  this.vars = Object.create(null);
  this.parent = parent || null;
  this.self = selfObj || (parent ? parent.self : null);
}
Scope.prototype.find = function(name){
  const k = name.toUpperCase();
  let s = this;
  while (s){ if (s.vars[k]) return s.vars[k]; s = s.parent; }
  return null;
};

function isArr(v){ return v && v.__arr === true; }
function isRec(v){ return v && v.__rec === true; }
function isObj(v){ return v && v.__obj === true; }

function typeOfValue(v){
  if (typeof v === "number") return Number.isInteger(v) ? "INTEGER" : "REAL";
  if (typeof v === "string") return v.length === 1 ? "CHAR" : "STRING";
  if (typeof v === "boolean") return "BOOLEAN";
  if (isArr(v)) return "ARRAY";
  if (isRec(v)) return v.type;
  if (isObj(v)) return v.cls.name;
  return "?";
}

function fmt(v){
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number"){
    if (Number.isInteger(v)) return String(v);
    return String(Math.round(v * 1e10) / 1e10);
  }
  if (v === undefined || v === null) return "";
  if (isArr(v)) return "[array]";
  if (isRec(v)) return "[record " + v.type + "]";
  if (isObj(v)) return "[object " + v.cls.name + "]";
  return String(v);
}

function Interp(opts){
  this.level = (opts && opts.level) || null;
  opts = opts || {};
  this.out = [];
  this.warnings = [];
  this.inputs = (opts.inputs || []).slice();
  this.inPos = 0;
  this.files = Object.create(null);
  (opts.files || []).forEach(f => { this.files[f.name] = { lines:(f.lines||[]).slice(), mode:null, pos:0 }; });
  this.globals = new Scope(null);
  this.procs = Object.create(null);
  this.funcs = Object.create(null);
  this.types = Object.create(null);
  this.classes = Object.create(null);
  this.enums = Object.create(null);
  this.enumTypes = Object.create(null);
  this.steps = 0;
  this.depth = 0;
  this.offset = opts.offset || 0;
}

Interp.prototype.rl = function(line){ return Math.max(1, line - this.offset); };
Interp.prototype.err = function(line, msg, hint){ throw PErr(this.rl(line), msg, hint); };
Interp.prototype.warn = function(line, msg){
  const s = "Line " + this.rl(line) + ": " + msg;
  if (this.warnings.indexOf(s) === -1 && this.warnings.length < 25) this.warnings.push(s);
};
Interp.prototype.step = function(line){
  if (++this.steps > MAX_STEPS)
    this.err(line, "This has been running for a very long time and looks like it will never stop.",
      "Something inside the loop must change the value the condition tests, or the loop can never end.");
};
Interp.prototype.emit = function(s, line){
  if (this.out.length >= MAX_OUT)
    this.err(line, "This has produced more than " + MAX_OUT + " lines of output.",
      "That normally means a loop is not stopping when it should.");
  this.out.push(s);
};

/* ---- default values, used for array elements and record fields ---- */
Interp.prototype.defaultFor = function(t, line){
  switch(t){
    case "INTEGER": case "REAL": return 0;
    case "STRING": return "";
    case "CHAR": return " ";
    case "BOOLEAN": return false;
    case "DATE": return "01/01/2000";
  }
  if (this.types[t]) return this.makeRecord(t, line);
  return 0;
};
function cloneRec(v){
  if (!v || !v.__rec) return v;
  const c = { __rec:true, type:v.type, f:Object.create(null) };
  for (const k in v.f) c.f[k] = cloneRec(v.f[k]);
  return c;
}
Interp.prototype.makeRecord = function(tname, line){
  const def = this.types[tname];
  const r = { __rec:true, type:tname, f:Object.create(null) };
  def.fields.forEach(fd => {
    r.f[fd.name.toUpperCase()] = fd.arr ? this.makeArray(fd.arr, this.globals) : this.defaultFor(fd.type, line);
  });
  return r;
};
Interp.prototype.makeArray = function(node, scope){
  const dims = node.dims.map(d => {
    const lo = this.ev(d[0], scope), hi = this.ev(d[1], scope);
    if (typeof lo !== "number" || typeof hi !== "number")
      this.err(node.line, "Array bounds must be whole numbers.");
    if (hi < lo) this.err(node.line, "The upper bound of an array cannot be below the lower bound.",
      "ARRAY[1:30] means indexes 1 to 30.");
    if ((hi - lo + 1) > 2000000) this.err(node.line, "That array is too large to create here.");
    return [lo, hi];
  });
  let n = 1; dims.forEach(d => { n *= (d[1] - d[0] + 1); });
  const data = new Array(n);
  const dv = this.defaultFor(node.elemType, node.line);
  for (let i = 0; i < n; i++) data[i] = (dv && typeof dv === "object") ? this.defaultFor(node.elemType, node.line) : dv;
  return { __arr:true, dims:dims, data:data, elemType:node.elemType };
};
Interp.prototype.flatIndex = function(arr, idx, line, name){
  if (idx.length !== arr.dims.length)
    this.err(line, "'" + name + "' has " + arr.dims.length + " dimension" + (arr.dims.length>1?"s":"") +
      " but you gave " + idx.length + " index" + (idx.length>1?"es":"") + ".",
      arr.dims.length === 2 ? "A two-dimensional array is indexed as  Name[Row, Column]" : "");
  let f = 0;
  for (let d = 0; d < idx.length; d++){
    const v = idx[d];
    if (typeof v !== "number" || !Number.isInteger(v))
      this.err(line, "An array index must be a whole number, but it was " + fmt(v) + ".");
    const [lo,hi] = arr.dims[d];
    if (v < lo || v > hi)
      this.err(line, "Index " + v + " is outside '" + name + "', which runs from " + lo + " to " + hi + ".",
        "Check the loop bounds. Going one past the end is the usual cause.");
    const size = hi - lo + 1;
    f = f * size + (v - lo);
  }
  return f;
};

/* ---- type checking on assignment ---- */
Interp.prototype.coerce = function(v, t, line, name){
  if (!t) return v;
  if (t === "REAL"){
    if (typeof v !== "number") this.err(line, "'" + name + "' is a REAL, so it can only hold a number, but you gave it " + describe(v) + ".");
    return v;
  }
  if (t === "INTEGER"){
    if (typeof v !== "number") this.err(line, "'" + name + "' is an INTEGER, so it can only hold a whole number, but you gave it " + describe(v) + ".");
    if (!Number.isInteger(v)) this.err(line, "'" + name + "' is an INTEGER but " + fmt(v) + " has a fractional part.",
      "Declare it as REAL, or use DIV( ) or INT( ) to get a whole number.");
    return v;
  }
  if (t === "STRING"){
    if (typeof v !== "string") this.err(line, "'" + name + "' is a STRING, so it can only hold text, but you gave it " + describe(v) + ".",
      "Text goes in double quotes. Use NUM_TO_STRING( ) to turn a number into text.");
    return v;
  }
  if (t === "CHAR"){
    if (typeof v !== "string") this.err(line, "'" + name + "' is a CHAR, so it holds one character, but you gave it " + describe(v) + ".");
    if (v.length !== 1) this.err(line, "'" + name + "' is a CHAR and holds exactly one character, but \"" + v + "\" has " + v.length + ".",
      "Declare it as STRING if it needs to hold more than one character.");
    return v;
  }
  if (t === "BOOLEAN"){
    if (typeof v !== "boolean") this.err(line, "'" + name + "' is a BOOLEAN, so it can only be TRUE or FALSE, but you gave it " + describe(v) + ".");
    return v;
  }
  return v;
};
function describe(v){
  if (typeof v === "number") return "the number " + fmt(v);
  if (typeof v === "string") return 'the text "' + v + '"';
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (isArr(v)) return "a whole array";
  if (isRec(v)) return "a record";
  if (isObj(v)) return "an object";
  return "something else";
}

/* ---- lvalues ---- */
Interp.prototype.lval = function(node, scope){
  const self = this;
  if (node.kind === "Var"){
    let box = scope.find(node.name);
    if (!box && scope.self){
      const k = node.name.toUpperCase();
      if (k in scope.self.f){
        return { get(){ return scope.self.f[k]; },
                 set(v){ scope.self.f[k] = self.coerce(v, scope.self.types[k], node.line, node.name); },
                 name:node.name, box:null };
      }
    }
    if (!box){
      self.warn(node.line, "'" + node.name + "' was used without being declared. In the exam, DECLARE it first.");
      box = { v:undefined, t:null, init:false };
      scope.vars[node.name.toUpperCase()] = box;
    }
    if (box.konst) self.err(node.line, "'" + node.name + "' is a CONSTANT, so its value cannot be changed.");
    return { get(){ return box.v; },
             set(v){ box.v = self.coerce(v, box.t, node.line, node.name); box.init = true; },
             name:node.name, box:box };
  }
  if (node.kind === "Index"){
    const base = this.lval(node.target, scope);
    const arr = base.get();
    if (!isArr(arr)) self.err(node.line, "'" + base.name + "' is not an array, so it cannot be indexed with [ ].");
    const idx = node.idx.map(e => this.ev(e, scope));
    const f = this.flatIndex(arr, idx, node.line, base.name);
    return { get(){ return arr.data[f]; },
             set(v){ arr.data[f] = self.coerce(v, arr.elemType, node.line, base.name + "[...]"); },
             name:base.name + "[" + idx.join(",") + "]", box:null };
  }
  if (node.kind === "Field"){
    const base = this.lval(node.obj, scope);
    const o = base.get();
    const k = node.name.toUpperCase();
    if (isRec(o)){
      if (!(k in o.f)) self.err(node.line, "The record type '" + o.type + "' has no field called '" + node.name + "'.");
      return { get(){ return o.f[k]; }, set(v){ o.f[k] = v; }, name:base.name + "." + node.name, box:null };
    }
    if (isObj(o)){
      if (!(k in o.f)) self.err(node.line, "'" + o.cls.name + "' has no attribute called '" + node.name + "'.");
      if (o.types[k] !== undefined && o.vis[k] === "PRIVATE" && scope.self !== o)
        self.err(node.line, "'" + node.name + "' is PRIVATE, so it cannot be reached from outside the class.",
          "That is encapsulation working. Use a public method - a getter or a setter - instead.");
      return { get(){ return o.f[k]; }, set(v){ o.f[k] = self.coerce(v, o.types[k], node.line, node.name); }, name:node.name, box:null };
    }
    self.err(node.line, "A dot can only be used on a record or an object.");
  }
  this.err(node.line, "This cannot have a value stored in it.",
    "The left of ← must be a variable, an array element or a field.");
};

/* ---- expressions ---- */
Interp.prototype.ev = function(n, scope){
  const self = this;
  switch(n.kind){
    case "Num": return n.v;
    case "Str": return n.v;
    case "Chr": return n.v;
    case "Bool": return n.v;

    case "Var": {
      const k = n.name.toUpperCase();
      const box = scope.find(n.name);
      if (box){
        if (!box.init) this.err(n.line, "'" + n.name + "' has been declared but nothing has been put in it yet.",
          "Give it a starting value before you read it. Totals and counters normally start at 0.");
        return box.v;
      }
      if (scope.self && (k in scope.self.f)) return scope.self.f[k];
      if (this.enums[k] !== undefined) return this.enums[k];
      if (this.funcs[k]) return this.callFunc(this.funcs[k], [], n.line, scope);
      this.err(n.line, "'" + n.name + "' has not been declared.",
        "Every variable needs  DECLARE " + n.name + " : TYPE  before it is used. Check the spelling too.");
      break;
    }

    case "Index": return this.lval(n, scope).get();
    case "Field": {
      const o = this.ev(n.obj, scope);
      const k = n.name.toUpperCase();
      if (isRec(o)){
        if (!(k in o.f)) this.err(n.line, "The record type '" + o.type + "' has no field called '" + n.name + "'.");
        return o.f[k];
      }
      if (isObj(o)){
        if (!(k in o.f)) this.err(n.line, "'" + o.cls.name + "' has no attribute called '" + n.name + "'.");
        if (o.vis[k] === "PRIVATE" && scope.self !== o)
          this.err(n.line, "'" + n.name + "' is PRIVATE, so it cannot be read from outside the class.",
            "Add a public getter function that returns it - that is what getters are for.");
        return o.f[k];
      }
      this.err(n.line, "A dot can only be used on a record or an object.");
      break;
    }

    case "Un": {
      const v = this.ev(n.e, scope);
      if (n.op === "-"){
        if (typeof v !== "number") this.err(n.line, "Only a number can be made negative.");
        return -v;
      }
      if (typeof v !== "boolean") this.err(n.line, "NOT only works on something that is TRUE or FALSE.");
      return !v;
    }

    case "Bin": return this.binop(n, scope);

    case "Call": {
      if (n.callee.kind !== "Var") this.err(n.line, "This is not something that can be called.");
      const name = n.callee.name, k = name.toUpperCase();
      if (BUILTIN[k]) return BUILTIN[k].call(this, n, scope);
      // inside a class method, the object's own (and inherited) methods
      // are reachable by their bare name
      if (scope.self){
        const m = this.findMethod(scope.self.cls, name);
        if (m && m.kind === "Func")
          return this.callSub(m, this.evalArgs(m, n.args, scope), n.line, scope.self, n.args, scope);
        if (m) this.err(n.line, "'" + name + "' is a procedure, so it does not give a value back.",
          "Invoke it on its own line with  CALL " + name + "( ... )");
      }
      if (this.funcs[k]) return this.callFunc(this.funcs[k], this.evalArgs(this.funcs[k], n.args, scope), n.line, scope, n.args);
      if (this.procs[k]) this.err(n.line, "'" + name + "' is a procedure, so it does not give a value back.",
        "Invoke it on its own line with  CALL " + name + "( ... )  . If it should return a value, make it a FUNCTION.");
      this.err(n.line, "There is no function called '" + name + "'.",
        "Check the spelling, and that it is defined before it is used.");
      break;
    }

    case "Method": {
      const o = this.ev(n.obj, scope);
      if (!isObj(o)) this.err(n.line, "'" + n.name + "' can only be called on an object.");
      const m = this.findMethod(o.cls, n.name);
      if (!m) this.err(n.line, "'" + o.cls.name + "' has no method called '" + n.name + "'.");
      if (m.kind === "Proc") this.err(n.line, "'" + n.name + "' is a procedure, so it gives nothing back.",
        "Use  CALL " + (n.obj.kind === "Var" ? n.obj.name : "Object") + "." + n.name + "( ... )  on its own line.");
      return this.callSub(m, this.evalArgs(m, n.args, scope), n.line, o, n.args, scope);
    }

    case "New": {
      const cls = this.classes[n.cls.toUpperCase()];
      if (!cls) this.err(n.line, "There is no class called '" + n.cls + "'.");
      return this.instantiate(cls, n.args, n.line, scope, n.args);
    }

    case "Super": this.err(n.line, "SUPER can only be used as  CALL SUPER.NEW( ... )  inside a subclass.");
  }
  this.err(n.line, "I could not work out the value of this.");
};

Interp.prototype.binop = function(n, scope){
  const op = n.op;
  if (op === "AND" || op === "OR"){
    const l = this.ev(n.l, scope);
    if (typeof l !== "boolean") this.err(n.line, op + " needs a condition on each side, not " + describe(l) + ".",
      "For example  IF Age >= 13 AND Age <= 19 THEN");
    if (op === "AND" && !l) return false;
    if (op === "OR" && l) return true;
    const r = this.ev(n.r, scope);
    if (typeof r !== "boolean") this.err(n.line, op + " needs a condition on each side, not " + describe(r) + ".");
    return r;
  }
  const a = this.ev(n.l, scope), b = this.ev(n.r, scope);

  if (op === "&"){
    if (typeof a === "boolean" || typeof b === "boolean" || a === undefined || b === undefined)
      this.err(n.line, "& joins text. One side is not text.");
    return String(typeof a === "number" ? fmt(a) : a) + String(typeof b === "number" ? fmt(b) : b);
  }
  if (op === "=" || op === "<>"){
    if (typeof a !== typeof b && !(isRec(a)||isObj(a)))
      this.err(n.line, "You are comparing " + describe(a) + " with " + describe(b) + ", which can never match.",
        typeof a === "string" || typeof b === "string"
          ? "Use STRING_TO_NUM( ) or NUM_TO_STRING( ) so both sides are the same kind of thing."
          : "");
    const eq = a === b;
    return op === "=" ? eq : !eq;
  }
  if (op === "<" || op === ">" || op === "<=" || op === ">="){
    if (typeof a !== typeof b)
      this.err(n.line, "You cannot compare " + describe(a) + " with " + describe(b) + ".");
    if (typeof a === "boolean") this.err(n.line, "TRUE and FALSE cannot be put in order with " + op + ".");
    switch(op){ case "<": return a < b; case ">": return a > b; case "<=": return a <= b; default: return a >= b; }
  }

  if (typeof a !== "number" || typeof b !== "number"){
    if (op === "+" && (typeof a === "string" || typeof b === "string"))
      this.err(n.line, "'+' adds numbers. To join text together use & instead.",
        'For example  FullName ← First & " " & Last');
    this.err(n.line, "'" + op + "' works on numbers, but you gave it " +
      (typeof a !== "number" ? describe(a) : describe(b)) + ".");
  }
  switch(op){
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/":
      if (b === 0) this.err(n.line, "You cannot divide by zero.",
        "A count that is still 0 is the usual cause. Guard it with  IF Count > 0 THEN  before dividing.");
      return a / b;
    case "^": return Math.pow(a, b);
  }
  this.err(n.line, "Unknown operator '" + op + "'.");
};

/* ---- built-in functions ---- */
function argCheck(I, n, scope, want, name){
  if (n.args.length !== want)
    I.err(n.line, name + " takes " + want + " value" + (want>1?"s":"") + ", but you gave " + n.args.length + ".");
  return n.args.map(a => I.ev(a, scope));
}
function needNum(I, v, line, name, which){
  if (typeof v !== "number") I.err(line, name + " needs a number" + (which?" as its " + which:"") + ", not " + describe(v) + ".");
  return v;
}
function needStr(I, v, line, name, which){
  if (typeof v !== "string") I.err(line, name + " needs text" + (which?" as its " + which:"") + ", not " + describe(v) + ".",
    "Use NUM_TO_STRING( ) if you have a number.");
  return v;
}
const BUILTIN = {
  /* ---- IGCSE 0478 dialect ----------------------------------------------
     These execute identically to their A Level counterparts. Which one is
     "correct" depends on the syllabus you are sitting, so the interpreter
     runs both and warns when you use the wrong one for your level. */
  SUBSTRING(n,s){ const a = argCheck(this,n,s,3,"SUBSTRING");
    this.dialect(n.line, "igcse", "SUBSTRING", "MID");
    const str = needStr(this,a[0],n.line,"SUBSTRING","first value");
    const st = needNum(this,a[1],n.line,"SUBSTRING","starting position");
    const ln = needNum(this,a[2],n.line,"SUBSTRING","number of characters");
    if (st < 1) this.err(n.line, "SUBSTRING counts positions from 1, so its starting position cannot be " + st + ".");
    if (st > str.length) this.err(n.line, 'SUBSTRING was asked to start at position ' + st + ' but "' + str + '" is only ' + str.length + " characters long.",
      "Check the loop bound - it should be  1 TO LENGTH(Text)");
    return str.substr(st-1, ln); },
  UCASE(n,s){ const a = argCheck(this,n,s,1,"UCASE");
    this.dialect(n.line, "igcse", "UCASE", "TO_UPPER");
    return needStr(this,a[0],n.line,"UCASE").toUpperCase(); },
  LCASE(n,s){ const a = argCheck(this,n,s,1,"LCASE");
    this.dialect(n.line, "igcse", "LCASE", "TO_LOWER");
    return needStr(this,a[0],n.line,"LCASE").toLowerCase(); },
  ROUND(n,s){ const a = argCheck(this,n,s,2,"ROUND");
    this.dialect(n.line, "igcse", "ROUND", null);
    const v = needNum(this,a[0],n.line,"ROUND","first value");
    const p = needNum(this,a[1],n.line,"ROUND","number of decimal places");
    if (p < 0) this.err(n.line, "ROUND cannot use a negative number of decimal places.");
    const m = Math.pow(10, p);
    return Math.round(v * m) / m; },
  RANDOM(n,s){ argCheck(this,n,s,0,"RANDOM");
    this.dialect(n.line, "igcse", "RANDOM", null);
    return Math.random(); },
  DIV(n,s){ const a = argCheck(this,n,s,2,"DIV");
    needNum(this,a[0],n.line,"DIV","first value"); needNum(this,a[1],n.line,"DIV","second value");
    if (a[1] === 0) this.err(n.line, "DIV cannot divide by zero.");
    return Math.floor(a[0]/a[1]); },
  MOD(n,s){ const a = argCheck(this,n,s,2,"MOD");
    needNum(this,a[0],n.line,"MOD","first value"); needNum(this,a[1],n.line,"MOD","second value");
    if (a[1] === 0) this.err(n.line, "MOD cannot divide by zero.");
    return a[0] - a[1]*Math.floor(a[0]/a[1]); },
  LENGTH(n,s){ const a = argCheck(this,n,s,1,"LENGTH");
    if (isArr(a[0])) return a[0].data.length;
    return needStr(this,a[0],n.line,"LENGTH").length; },
  LEFT(n,s){ const a = argCheck(this,n,s,2,"LEFT");
    this.dialect(n.line, "alevel", "LEFT", null);
    needStr(this,a[0],n.line,"LEFT","first value"); needNum(this,a[1],n.line,"LEFT","second value");
    if (a[1] < 0) this.err(n.line, "LEFT cannot take a negative number of characters.");
    return a[0].slice(0, a[1]); },
  RIGHT(n,s){ const a = argCheck(this,n,s,2,"RIGHT");
    this.dialect(n.line, "alevel", "RIGHT", null);
    needStr(this,a[0],n.line,"RIGHT","first value"); needNum(this,a[1],n.line,"RIGHT","second value");
    if (a[1] < 0) this.err(n.line, "RIGHT cannot take a negative number of characters.");
    return a[1] === 0 ? "" : a[0].slice(-a[1]); },
  MID(n,s){ const a = argCheck(this,n,s,3,"MID");
    this.dialect(n.line, "alevel", "MID", "SUBSTRING");
    const str = needStr(this,a[0],n.line,"MID","first value");
    const st = needNum(this,a[1],n.line,"MID","starting position");
    const ln = needNum(this,a[2],n.line,"MID","number of characters");
    if (st < 1) this.err(n.line, "MID counts positions from 1, so its starting position cannot be " + st + ".");
    if (st > str.length) this.err(n.line, 'MID was asked to start at position ' + st + ' but "' + str + '" is only ' + str.length + " characters long.",
      "Check the loop bound - it should be  1 TO LENGTH(Text)");
    return str.substr(st-1, ln); },
  TO_UPPER(n,s){ const a = argCheck(this,n,s,1,"TO_UPPER");
    this.dialect(n.line, "alevel", "TO_UPPER", "UCASE"); return needStr(this,a[0],n.line,"TO_UPPER").toUpperCase(); },
  TO_LOWER(n,s){ const a = argCheck(this,n,s,1,"TO_LOWER");
    this.dialect(n.line, "alevel", "TO_LOWER", "LCASE"); return needStr(this,a[0],n.line,"TO_LOWER").toLowerCase(); },
  NUM_TO_STRING(n,s){ const a = argCheck(this,n,s,1,"NUM_TO_STRING");
    this.dialect(n.line, "alevel", "NUM_TO_STRING", null); return fmt(needNum(this,a[0],n.line,"NUM_TO_STRING")); },
  STRING_TO_NUM(n,s){ const a = argCheck(this,n,s,1,"STRING_TO_NUM");
    this.dialect(n.line, "alevel", "STRING_TO_NUM", null);
    const t = needStr(this,a[0],n.line,"STRING_TO_NUM").trim();
    if (t === "" || isNaN(Number(t))) this.err(n.line, 'STRING_TO_NUM cannot turn "' + a[0] + '" into a number.',
      "Test it with IS_NUM( ) first if the text might not be numeric.");
    return Number(t); },
  IS_NUM(n,s){ const a = argCheck(this,n,s,1,"IS_NUM");
    this.dialect(n.line, "alevel", "IS_NUM", null);
    const t = needStr(this,a[0],n.line,"IS_NUM").trim();
    return t !== "" && !isNaN(Number(t)); },
  ASC(n,s){ const a = argCheck(this,n,s,1,"ASC");
    this.dialect(n.line, "alevel", "ASC", null);
    const c = needStr(this,a[0],n.line,"ASC");
    if (c.length !== 1) this.err(n.line, "ASC needs exactly one character.");
    return c.charCodeAt(0); },
  CHR(n,s){ const a = argCheck(this,n,s,1,"CHR");
    this.dialect(n.line, "alevel", "CHR", null); return String.fromCharCode(needNum(this,a[0],n.line,"CHR")); },
  INT(n,s){ const a = argCheck(this,n,s,1,"INT");
    this.dialect(n.line, "alevel", "INT", null); return Math.trunc(needNum(this,a[0],n.line,"INT")); },
  RAND(n,s){ const a = argCheck(this,n,s,1,"RAND");
    this.dialect(n.line, "alevel", "RAND", null); return Math.random() * needNum(this,a[0],n.line,"RAND"); },
  EOF(n,s){ const a = argCheck(this,n,s,1,"EOF");
    const name = String(a[0]);
    const f = this.files[name];
    if (!f) this.err(n.line, 'EOF was asked about "' + name + '", which has not been opened.',
      'Open it first with  OPENFILE "' + name + '" FOR READ');
    return f.pos >= f.lines.length; }
};

/* ---- subroutines ---- */
Interp.prototype.findMethod = function(cls, name){
  const k = name.toUpperCase();
  let c = cls;
  while (c){ if (c.methods[k]) return c.methods[k]; c = c.parent; }
  return null;
};
/* A BYREF argument must NOT be evaluated before the call: it is often an
   empty variable waiting to receive a result. Evaluating it would fail with
   "nothing has been put in it yet". Bind it by reference instead. */
Interp.prototype.evalArgs = function(sub, argNodes, scope){
  return argNodes.map((a, i) => {
    const p = sub.params[i];
    if (p && p.mode === "BYREF" && ["Var","Index","Field"].indexOf(a.kind) !== -1) return undefined;
    return this.ev(a, scope);
  });
};
/* Level-aware notation advice. Never an error - the code always runs.
   level "igcse" | "as" | "a2" | null (null = say nothing). */
Interp.prototype.dialect = function(line, family, used, instead){
  const lv = this.level;
  if (!lv) return;
  const sittingIgcse = (lv === "igcse");
  if (family === "igcse" && !sittingIgcse){
    this.warn(line, instead
      ? used + " is IGCSE notation. At AS/A Level write " + instead + " instead."
      : used + " is IGCSE notation and is not part of the 9618 syllabus.");
  } else if (family === "alevel" && sittingIgcse){
    this.warn(line, instead
      ? used + " is AS/A Level notation. For IGCSE 0478 write " + instead + " instead."
      : used + " is not in the IGCSE 0478 pseudocode guide, so it will not appear in your exam.");
  }
};
/* Constructs that exist only above IGCSE. */
Interp.prototype.aboveIgcse = function(line, what){
  if (this.level === "igcse")
    this.warn(line, what + " is not in the IGCSE 0478 syllabus - you will not need it in your exam.");
};

Interp.prototype.bindParams = function(sub, vals, line, scope, argNodes){
  if (vals.length !== sub.params.length)
    this.err(line, "'" + sub.name + "' takes " + sub.params.length + " value" + (sub.params.length===1?"":"s") +
      ", but you gave " + vals.length + ".");
  const inner = new Scope(this.globals);
  sub.params.forEach((p, i) => {
    const key = p.name.toUpperCase();
    if (p.mode === "BYREF") this.aboveIgcse(line, "Passing a parameter BYREF");
    if (p.mode === "BYREF" && argNodes && argNodes[i] &&
        ["Var","Index","Field"].indexOf(argNodes[i].kind) !== -1){
      const ref = this.lval(argNodes[i], scope);
      const self = this;
      Object.defineProperty(inner.vars, key, {
        configurable:true, enumerable:true,
        value:{ get v(){ return ref.get(); }, set v(x){ ref.set(x); }, t:p.type, init:true }
      });
    } else {
      if (p.mode === "BYREF" && argNodes)
        this.warn(line, "'" + p.name + "' is BYREF, so it needs a variable passed to it, not a fixed value.");
      inner.vars[key] = { v:this.coerce(vals[i], p.type, line, p.name), t:p.type, init:true };
    }
  });
  return inner;
};
Interp.prototype.callSub = function(sub, vals, line, selfObj, argNodes, scope){
  if (++this.depth > MAX_DEPTH){
    this.depth--;
    this.err(line, "'" + sub.name + "' has called itself far too many times.",
      "A recursive routine needs a base case that returns without calling itself, and each call must move towards it.");
  }
  const inner = this.bindParams(sub, vals, line, scope || this.globals, argNodes);
  inner.self = selfObj || null;
  let result;
  try{
    this.exec(sub.body, inner);
    if (sub.kind === "Func")
      this.err(sub.line, "Function '" + sub.name + "' finished without reaching a RETURN.",
        "Every path through a function must end in RETURN, including the ELSE branches.");
  }catch(e){
    if (e && e.__ret) result = e.value; else { this.depth--; throw e; }
  }
  this.depth--;
  if (sub.kind === "Func") return this.coerce(result, sub.ret, line, sub.name);
  return undefined;
};
Interp.prototype.callFunc = function(f, vals, line, scope, argNodes){
  return this.callSub(f, vals, line, null, argNodes, scope);
};
Interp.prototype.instantiate = function(cls, vals, line, scope, argNodes){
  const o = { __obj:true, cls:cls, f:Object.create(null), types:Object.create(null), vis:Object.create(null) };
  let c = cls, chain = [];
  while (c){ chain.unshift(c); c = c.parent; }
  chain.forEach(cc => {
    cc.attrs.forEach(a => {
      const k = a.name.toUpperCase();
      o.types[k] = a.type;
      o.vis[k] = a.vis;
      o.f[k] = a.dims ? this.makeArray({ dims:a.dims, elemType:a.elemType, line:line }, this.globals)
                      : this.defaultFor(a.type, line);
    });
  });
  const ctor = this.findMethod(cls, "NEW");
  if (ctor) this.callSub(ctor, this.evalArgs(ctor, argNodes || [], scope), line, o, argNodes, scope);
  else if (vals.length) this.err(line, "'" + cls.name + "' has no NEW constructor, so it cannot be given values here.",
    "Add  PUBLIC PROCEDURE NEW( ... )  to the class.");
  return o;
};

/* ---- statements ---- */
Interp.prototype.exec = function(n, scope){
  const self = this;
  switch(n.kind){
    case "Block":
      for (let i = 0; i < n.body.length; i++) this.exec(n.body[i], scope);
      return;

    case "Declare":
      n.names.forEach(name => {
        const k = name.toUpperCase();
        if (scope.vars[k]) this.warn(n.line, "'" + name + "' has already been declared.");
        if (!this.types[n.type] && !this.classes[n.type.toUpperCase()] &&
            !this.enumTypes[n.type.toUpperCase()] &&
            ["INTEGER","REAL","CHAR","STRING","BOOLEAN","DATE"].indexOf(n.type) === -1)
          this.err(n.line, "'" + n.type + "' is not a data type I know.",
            "Use INTEGER, REAL, CHAR, STRING, BOOLEAN or DATE, or define it first with TYPE or CLASS.");
        if (this.enumTypes[n.type.toUpperCase()]){
          scope.vars[k] = { v:undefined, t:null, init:false };
          return;
        }
        const isRecType = !!this.types[n.type];
        const existing = scope.vars[k];
        if (existing && existing.init) return;    // re-declaring must not wipe a value
        scope.vars[k] = { v:isRecType ? this.makeRecord(n.type, n.line) : undefined,
                          t:this.classes[n.type.toUpperCase()] ? null : n.type,
                          init:isRecType };
      });
      return;

    case "DeclareArray":
      n.names.forEach(name => {
        const k = name.toUpperCase();
        const existing = scope.vars[k];
        // re-declaring an array that already holds data must not empty it
        if (existing && isArr(existing.v)) return;
        scope.vars[k] = { v:this.makeArray(n, scope), t:null, init:true };
      });
      return;

    case "Const": {
      const k = n.name.toUpperCase();
      const v = this.ev(n.value, scope);
      scope.vars[k] = { v:v, t:null, init:true, konst:true };
      return;
    }

    case "Assign": {
      const v = this.ev(n.value, scope);
      if (v === undefined) this.err(n.line, "The right-hand side of this assignment has no value.");
      this.lval(n.target, scope).set(v);
      return;
    }

    case "Output": {
      const s = n.parts.map(p => {
        const v = this.ev(p, scope);
        if (v === undefined) this.err(n.line, "OUTPUT was given something with no value in it.");
        return fmt(v);
      }).join("");
      this.emit(s, n.line);
      return;
    }

    case "Input": {
      if (n.prompt !== null && n.prompt !== undefined){
        this.warn(n.line, "INPUT takes only a variable. Put the prompt on its own OUTPUT line above it.");
        this.emit(n.prompt, n.line);
      }
      if (this.inPos >= this.inputs.length)
        this.err(n.line, "The program asked for input but there is none left.",
          "Type the values the program should read into the Input box, one per line, then run it again.");
      const raw = this.inputs[this.inPos++];
      const ref = this.lval(n.target, scope);
      const t = (ref.box && ref.box.t) || null;
      let v = raw;
      if (t === "INTEGER" || t === "REAL"){
        if (raw.trim() === "" || isNaN(Number(raw)))
          this.err(n.line, '"' + raw + '" was read from the Input box but \'' + ref.name + "' is a number.",
            "Put one value on each line of the Input box, in the order the program asks for them.");
        v = Number(raw);
      } else if (t === "BOOLEAN"){
        const u = raw.trim().toUpperCase();
        if (u !== "TRUE" && u !== "FALSE") this.err(n.line, "'" + ref.name + "' is a BOOLEAN, so the input must be TRUE or FALSE.");
        v = (u === "TRUE");
      } else if (t === null && raw.trim() !== "" && !isNaN(Number(raw))){
        v = Number(raw);
      }
      ref.set(v);
      return;
    }

    case "If": {
      const c = this.ev(n.cond, scope);
      if (typeof c !== "boolean")
        this.err(n.line, "The condition after IF must be TRUE or FALSE, but it worked out to " + describe(c) + ".",
          "A condition compares two things, for example  IF Mark >= 50 THEN");
      if (c) this.exec(n.then, scope);
      else if (n.other) this.exec(n.other, scope);
      return;
    }

    case "Case": {
      const v = this.ev(n.subject, scope);
      for (let i = 0; i < n.branches.length; i++){
        const b = n.branches[i];
        const lo = this.ev(b.lo, scope);
        let hit;
        if (b.hi !== null && b.hi !== undefined){
          const hi = this.ev(b.hi, scope);
          hit = (v >= lo && v <= hi);
        } else hit = (v === lo);
        if (hit){ this.exec(b.body, scope); return; }
      }
      if (n.other) this.exec(n.other, scope);
      else this.warn(n.line, "No CASE branch matched " + fmt(v) + " and there is no OTHERWISE, so nothing happened.");
      return;
    }

    case "For": {
      if (n.warn) { const s = n.warn.replace(/^Line (\d+)/, (m,d) => "Line " + this.rl(Number(d)));
                    if (this.warnings.indexOf(s) === -1) this.warnings.push(s); }
      const from = this.ev(n.from, scope), to = this.ev(n.to, scope);
      const step = n.step ? this.ev(n.step, scope) : 1;
      if (typeof from !== "number" || typeof to !== "number" || typeof step !== "number")
        this.err(n.line, "A FOR loop counts with numbers.");
      if (step === 0) this.err(n.line, "STEP 0 means the counter never changes, so this loop could never end.");
      const k = n.v.toUpperCase();
      if (!scope.vars[k] && !scope.find(n.v)) scope.vars[k] = { v:undefined, t:"INTEGER", init:false };
      const box = scope.find(n.v);
      for (let i = from; step > 0 ? i <= to : i >= to; i += step){
        this.step(n.line);
        box.v = i; box.init = true;
        this.exec(n.body, scope);
      }
      box.v = (step > 0 ? Math.max(from, to + step) : Math.min(from, to + step));
      return;
    }

    case "While": {
      for(;;){
        this.step(n.line);
        const c = this.ev(n.cond, scope);
        if (typeof c !== "boolean")
          this.err(n.line, "The condition after WHILE must be TRUE or FALSE, but it worked out to " + describe(c) + ".");
        if (!c) return;
        this.exec(n.body, scope);
      }
    }

    case "Repeat": {
      for(;;){
        this.step(n.line);
        this.exec(n.body, scope);
        const c = this.ev(n.cond, scope);
        if (typeof c !== "boolean")
          this.err(n.line, "The condition after UNTIL must be TRUE or FALSE, but it worked out to " + describe(c) + ".");
        if (c) return;
      }
    }

    case "Proc": this.procs[n.name.toUpperCase()] = n; return;
    case "Func": this.funcs[n.name.toUpperCase()] = n; return;

    case "RecType":
      this.aboveIgcse(n.line, "Defining a record with TYPE");
      this.types[n.name] = n; return;
    case "EnumType":
      this.enumTypes[n.name.toUpperCase()] = n;
      n.values.forEach((v,i) => { this.enums[v.toUpperCase()] = i; });
      return;

    case "Class": {
      this.aboveIgcse(n.line, "Defining a CLASS");
      const parent = n.parent ? this.classes[n.parent.toUpperCase()] : null;
      if (n.parent && !parent) this.err(n.line, "'" + n.parent + "' is not a class that has been defined yet.",
        "The parent class must appear above the subclass.");
      const methods = Object.create(null);
      n.methods.forEach(m => { methods[m.name.toUpperCase()] = m; });
      this.classes[n.name.toUpperCase()] = { name:n.name, parent:parent, attrs:n.attrs, methods:methods };
      return;
    }

    case "CallStmt": {
      const c = n.call;
      if (c.kind === "Method"){
        if (c.obj.kind === "Super"){
          if (!scope.self) this.err(n.line, "SUPER can only be used inside a class method.");
          const pc = scope.self.cls.parent;
          if (!pc) this.err(n.line, "This class does not inherit from anything, so SUPER has nothing to refer to.");
          const m = this.findMethod(pc, c.name);
          if (!m) this.err(n.line, "The parent class has no method called '" + c.name + "'.");
          this.callSub(m, this.evalArgs(m, c.args, scope), n.line, scope.self, c.args, scope);
          return;
        }
        const o = this.ev(c.obj, scope);
        if (!isObj(o)) this.err(n.line, "'" + c.name + "' can only be called on an object.");
        const m = this.findMethod(o.cls, c.name);
        if (!m) this.err(n.line, "'" + o.cls.name + "' has no method called '" + c.name + "'.");
        this.callSub(m, this.evalArgs(m, c.args, scope), n.line, o, c.args, scope);
        return;
      }
      if (c.callee && c.callee.kind === "Var"){
        const name = c.callee.name, k = name.toUpperCase();
        if (scope.self){
          const m = this.findMethod(scope.self.cls, name);
          if (m){ this.callSub(m, this.evalArgs(m, c.args, scope), n.line, scope.self, c.args, scope); return; }
        }
        if (this.procs[k]){ this.callSub(this.procs[k], this.evalArgs(this.procs[k], c.args, scope), n.line, null, c.args, scope); return; }
        if (this.funcs[k]){
          this.warn(n.line, "'" + name + "' is a function. Its returned value is being thrown away here.");
          this.callFunc(this.funcs[k], this.evalArgs(this.funcs[k], c.args, scope), n.line, scope, c.args);
          return;
        }
        this.err(n.line, "There is no procedure called '" + name + "'.",
          "Check the spelling, and that it is defined with PROCEDURE ... ENDPROCEDURE.");
      }
      this.err(n.line, "CALL must be followed by the name of a procedure.");
      return;
    }

    case "Return": {
      const e = { __ret:true, value: n.value ? this.ev(n.value, scope) : undefined };
      throw e;
    }

    /* ---- files ---- */
    case "OpenFile": {
      if (n.mode === "APPEND" || n.mode === "RANDOM")
        this.aboveIgcse(n.line, "Opening a file FOR " + n.mode);
      const name = String(this.ev(n.file, scope));
      let f = this.files[name];
      if (!f){ f = this.files[name] = { lines:[], mode:null, pos:0, records:Object.create(null) }; }
      if (f.mode) this.warn(n.line, '"' + name + '" was already open. Close it before opening it again.');
      if (!f.records) f.records = Object.create(null);
      if (n.mode === "WRITE") f.lines = [];
      f.mode = n.mode;
      f.pos = (n.mode === "RANDOM") ? 1 : ((n.mode === "READ") ? 0 : f.lines.length);
      return;
    }
    case "Seek": {
      const name = String(this.ev(n.file, scope));
      const f = this.files[name];
      if (!f || f.mode !== "RANDOM")
        this.err(n.line, '"' + name + '" is not open for random access.',
          'Open it first with  OPENFILE "' + name + '" FOR RANDOM');
      const addr = this.ev(n.arg, scope);
      if (typeof addr !== "number" || addr !== Math.floor(addr) || addr < 1)
        this.err(n.line, "A record address must be a whole number of 1 or more.");
      f.pos = addr;
      return;
    }

    case "GetRecord": {
      const name = String(this.ev(n.file, scope));
      const f = this.files[name];
      if (!f || f.mode !== "RANDOM")
        this.err(n.line, '"' + name + '" is not open for random access.',
          'Open it first with  OPENFILE "' + name + '" FOR RANDOM');
      const ref = this.lval(n.arg, scope);
      const stored = f.records[f.pos];
      if (stored === undefined){
        this.warn(n.line, 'There is no record at address ' + f.pos + ' of "' + name +
          '" yet, so an empty one was read.');
      } else {
        ref.set(cloneRec(stored));
      }
      f.pos = f.pos + 1;
      return;
    }

    case "PutRecord": {
      const name = String(this.ev(n.file, scope));
      const f = this.files[name];
      if (!f || f.mode !== "RANDOM")
        this.err(n.line, '"' + name + '" is not open for random access.',
          'Open it first with  OPENFILE "' + name + '" FOR RANDOM');
      const v = this.ev(n.arg, scope);
      f.records[f.pos] = cloneRec(v);
      f.pos = f.pos + 1;
      return;
    }

    case "ReadFile": {
      const name = String(this.ev(n.file, scope));
      const f = this.files[name];
      if (!f || f.mode !== "READ")
        this.err(n.line, '"' + name + '" is not open for reading.',
          'Open it first with  OPENFILE "' + name + '" FOR READ');
      if (f.pos >= f.lines.length)
        this.err(n.line, '"' + name + '" has no more lines, but READFILE asked for another one.',
          "Guard the read with  WHILE NOT EOF(\"" + name + "\") DO  so it stops at the end.");
      this.lval(n.target, scope).set(f.lines[f.pos++]);
      return;
    }
    case "WriteFile": {
      const name = String(this.ev(n.file, scope));
      const f = this.files[name];
      if (!f || (f.mode !== "WRITE" && f.mode !== "APPEND"))
        this.err(n.line, '"' + name + '" is not open for writing.',
          'Open it with FOR WRITE to start a new file, or FOR APPEND to add to the end of an existing one.');
      f.lines.push(fmt(this.ev(n.value, scope)));
      return;
    }
    case "CloseFile": {
      const name = String(this.ev(n.file, scope));
      const f = this.files[name];
      if (!f || !f.mode) this.warn(n.line, '"' + name + '" was not open, so CLOSEFILE did nothing.');
      else { f.mode = null; f.pos = 0; }
      return;
    }
  }
  this.err(n.line, "I do not know how to carry out this statement.");
};

/* ---- hoist subroutine and type definitions so order does not matter ---- */
Interp.prototype.hoist = function(block){
  block.body.forEach(s => {
    if (s.kind === "Proc") this.procs[s.name.toUpperCase()] = s;
    else if (s.kind === "Func") this.funcs[s.name.toUpperCase()] = s;
    else if (s.kind === "RecType") this.types[s.name] = s;
    else if (s.kind === "EnumType"){
      this.enumTypes[s.name.toUpperCase()] = s;
      s.values.forEach((v,i) => { this.enums[v.toUpperCase()] = i; });
    }
  });
};

/* ---------------------------------------------------------------- RUN --- */
window.PseudoRun = function(src, opts){
  opts = opts || {};
  const I = new Interp(opts);
  try{
    const ast = window.PseudoParse(src);
    I.hoist(ast);
    I.exec(ast, I.globals);
    const openFiles = Object.keys(I.files).filter(k => I.files[k].mode);
    openFiles.forEach(k => I.warn(0, 'The file "' + k + '" was left open. Always CLOSEFILE when you are finished with it.'));
    return { ok:true, output:I.out, warnings:I.warnings, files:I.files };
  }catch(e){
    if (e && e.__ret)
      return { ok:false, output:I.out, warnings:I.warnings,
               error:{ line:0, msg:"RETURN was used outside a function.",
                       hint:"RETURN belongs inside FUNCTION ... ENDFUNCTION. A procedure sends results back through BYREF parameters." } };
    if (e && e.pseudo)
      return { ok:false, output:I.out, warnings:I.warnings, error:{ line:e.line, msg:e.message, hint:e.hint } };
    if (e instanceof RangeError)
      return { ok:false, output:I.out, warnings:I.warnings,
               error:{ line:0, msg:"A subroutine called itself far too many times.",
                       hint:"A recursive routine needs a base case that returns WITHOUT calling itself, and every call must move closer to it." } };
    return { ok:false, output:I.out, warnings:I.warnings,
             error:{ line:0, msg:"Something went wrong running this: " + (e && e.message ? e.message : String(e)), hint:"" } };
  }
};
})();
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports){
  module.exports = { PseudoRun: globalThis.PseudoRun,
                     PseudoParse: globalThis.PseudoParse,
                     PseudoErr: globalThis.PseudoErr };
}
