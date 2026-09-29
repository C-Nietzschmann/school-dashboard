/* ============================================================================
   THE LIBRARY
   Every keyword and every built-in function, with a runnable example.

   Each entry:
     name     what it is called
     sig      its signature, or the shape of the statement
     levels   which syllabuses it belongs to
     what     one or two sentences
     ex       a COMPLETE runnable program
     out      exactly what that program outputs (lines joined with \n)
     miss     the mistake people actually make  (optional)

   `ex` and `out` are checked by tools/verify.mjs against the real
   interpreter, so no example here can be wrong.
   ========================================================================== */
"use strict";
var __g = (typeof window !== "undefined") ? window : globalThis;

var ALL = ["igcse","as","a2"], AL = ["as","a2"], A2 = ["a2"];

__g.LIBRARY = [

/* -------------------------------------------------------------- */
{ group:"Writing it down", entries:[
  { name:"//", sig:"// a comment", levels:ALL,
    what:"Everything after // on that line is ignored. Comment why you did something, not what the line plainly says.",
    ex:'// Skip the header row before totalling\nOUTPUT "counted"', out:"counted" },
  { name:"Identifiers", sig:"MyVariableName", levels:ALL,
    what:"Names you invent. Start with a letter, then letters, digits or underscores. CamelCase by convention, and the name should describe the thing.",
    ex:'DECLARE TotalScore : INTEGER\nTotalScore <- 42\nOUTPUT TotalScore', out:"42",
    miss:"Single letters are fine for a loop counter and nowhere else." },
  { name:"Indentation", sig:"four spaces per block", levels:ALL,
    what:"Statements inside a block are indented. This is not decoration - it is how the examiner sees which statements are inside the loop, and it carries marks.",
    ex:'DECLARE i : INTEGER\nFOR i <- 1 TO 3\n    OUTPUT i\nNEXT i', out:"1\n2\n3" }
]},

/* -------------------------------------------------------------- */
{ group:"Variables and constants", entries:[
  { name:"DECLARE", sig:"DECLARE Identifier : DataType", levels:ALL,
    what:"Creates a variable that can hold one value of one type. State every variable before the algorithm body.",
    ex:'DECLARE Name : STRING\nDECLARE Age  : INTEGER\nName <- "Amara"\nAge  <- 17\nOUTPUT Name, " is ", Age', out:"Amara is 17" },
  { name:"DECLARE (several)", sig:"DECLARE A, B, C : DataType", levels:ALL,
    what:"Several variables of the same type can share one line.",
    ex:'DECLARE X, Y, Z : INTEGER\nX <- 1\nY <- 2\nZ <- 3\nOUTPUT X + Y + Z', out:"6" },
  { name:"CONSTANT", sig:"CONSTANT Identifier = Value", levels:AL,
    what:"A value fixed for the whole program. Assigned with = at the point of declaration, and given no data type because the type is obvious from the value.",
    ex:'CONSTANT VAT = 0.2\nDECLARE Price : REAL\nPrice <- 50.00\nOUTPUT Price * (1 + VAT)', out:"60",
    miss:"This is the one place = does not mean comparison. Everywhere else, = compares." },
  { name:"CONSTANT (IGCSE)", sig:"CONSTANT Identifier <- Value", levels:["igcse"],
    what:"IGCSE material commonly writes the constant with an arrow rather than an equals sign. This checker accepts both, so neither can cost you a run.",
    ex:'CONSTANT MaxPlayers <- 4\nOUTPUT "Up to ", MaxPlayers, " players"', out:"Up to 4 players" },
  { name:"<-  (assignment)", sig:"Identifier <- Value", levels:ALL,
    what:"Puts a value into a variable. The right-hand side is worked out first, then stored. Type <- in the editor and it becomes the arrow.",
    ex:'DECLARE Count : INTEGER\nCount <- 0\nCount <- Count + 1\nCount <- Count + 1\nOUTPUT Count', out:"2",
    miss:"Writing Count = 0 instead. That is the single most common pseudocode error there is." }
]},

/* -------------------------------------------------------------- */
{ group:"Data types", entries:[
  { name:"INTEGER", sig:"DECLARE N : INTEGER", levels:ALL,
    what:"A whole number, positive or negative. No fractional part at all.",
    ex:'DECLARE N : INTEGER\nN <- -7\nOUTPUT N', out:"-7",
    miss:"Assigning 7.5 to an INTEGER is an error, not a rounding." },
  { name:"REAL", sig:"DECLARE R : REAL", levels:ALL,
    what:"A number that may have a fractional part. Note that 7.0 is REAL, not INTEGER.",
    ex:'DECLARE R : REAL\nR <- 3.75\nOUTPUT R * 2', out:"7.5" },
  { name:"CHAR", sig:"DECLARE C : CHAR", levels:ALL,
    what:"Exactly one character, written in SINGLE quotes.",
    ex:"DECLARE C : CHAR\nC <- 'A'\nOUTPUT C", out:"A",
    miss:"'A' is a CHAR; \"A\" is a STRING of length 1. Different types." },
  { name:"STRING", sig:"DECLARE S : STRING", levels:ALL,
    what:"Any number of characters, written in DOUBLE quotes. An empty string is \"\".",
    ex:'DECLARE S : STRING\nS <- "Hello"\nOUTPUT S, " has ", LENGTH(S), " characters"', out:"Hello has 5 characters" },
  { name:"BOOLEAN", sig:"DECLARE B : BOOLEAN", levels:ALL,
    what:"Only TRUE or FALSE, written without quotes. A BOOLEAN variable is already a condition.",
    ex:'DECLARE HasPaid : BOOLEAN\nHasPaid <- FALSE\nIF NOT HasPaid THEN\n    OUTPUT "Payment outstanding"\nENDIF', out:"Payment outstanding",
    miss:"IF HasPaid THEN reads better than IF HasPaid = TRUE THEN." },
  { name:"DATE", sig:"DECLARE D : DATE", levels:AL,
    what:"A calendar date, written dd/mm/yyyy.",
    ex:'DECLARE D : STRING\nD <- "01/09/2026"\nOUTPUT "Term starts ", D', out:"Term starts 01/09/2026" }
]},

/* -------------------------------------------------------------- */
{ group:"Arrays", entries:[
  { name:"ARRAY (1D)", sig:"DECLARE A : ARRAY[1:n] OF DataType", levels:ALL,
    what:"Many values of the SAME type under one name, reached by index. The bounds are written lower:upper and the syllabus normally starts at 1.",
    ex:'DECLARE Scores : ARRAY[1:5] OF INTEGER\nDECLARE i : INTEGER\nFOR i <- 1 TO 5\n    Scores[i] <- i * 10\nNEXT i\nOUTPUT Scores[1], " ", Scores[5]', out:"10 50",
    miss:"Indexing outside the declared bounds. Going one past the end is the usual cause." },
  { name:"ARRAY (2D)", sig:"DECLARE G : ARRAY[1:rows, 1:cols] OF DataType", levels:ALL,
    what:"A grid. Index with both numbers, row first.",
    ex:'DECLARE Grid : ARRAY[1:2, 1:3] OF INTEGER\nDECLARE R, C : INTEGER\nFOR R <- 1 TO 2\n    FOR C <- 1 TO 3\n        Grid[R, C] <- R * C\n    NEXT C\nNEXT R\nOUTPUT Grid[2, 3]', out:"6",
    miss:"Closing the inner loop after the outer one. NEXT C must come before NEXT R." },
  { name:"Array element", sig:"A[i]   or   G[row, col]", levels:ALL,
    what:"One element of the array, used exactly like an ordinary variable.",
    ex:'DECLARE A : ARRAY[1:3] OF STRING\nA[1] <- "red"\nA[2] <- "green"\nA[3] <- "blue"\nOUTPUT A[2]', out:"green" }
]},

/* -------------------------------------------------------------- */
{ group:"Input and output", entries:[
  { name:"OUTPUT", sig:"OUTPUT Value, Value, ...", levels:ALL,
    what:"Displays one or more values, separated by commas. Each OUTPUT starts a new line.",
    ex:'DECLARE N : STRING\nN <- "Ravi"\nOUTPUT "Hello ", N\nOUTPUT "Goodbye ", N', out:"Hello Ravi\nGoodbye Ravi" },
  { name:"INPUT", sig:"INPUT Identifier", levels:ALL,
    what:"Reads one value from the user into a variable. It takes a variable and nothing else.",
    ex:'DECLARE Name : STRING\nOUTPUT "Enter your name: "\nINPUT Name\nOUTPUT "Hello ", Name',
    out:"Enter your name: \nHello Amara", inputs:"Amara",
    miss:'INPUT "Enter name", Name is not the syntax. Put the prompt on its own OUTPUT line above it.' }
]},

/* -------------------------------------------------------------- */
{ group:"Arithmetic", entries:[
  { name:"+  -  *  /", sig:"A + B", levels:ALL,
    what:"Add, subtract, multiply, divide. Division always gives a REAL result.",
    ex:'OUTPUT 7 + 3\nOUTPUT 7 - 3\nOUTPUT 7 * 3\nOUTPUT 7 / 2', out:"10\n4\n21\n3.5" },
  { name:"^", sig:"A ^ B", levels:AL,
    what:"A raised to the power of B.",
    ex:'OUTPUT 2 ^ 10', out:"1024" },
  { name:"DIV", sig:"DIV(x, y) RETURNS INTEGER", levels:ALL,
    what:"The whole-number part of x divided by y, with the fraction discarded. Written as a function, not an operator.",
    ex:'OUTPUT DIV(19, 7)\nOUTPUT DIV(200, 60)', out:"2\n3",
    miss:"Used constantly for converting units: seconds to minutes, pence to pounds." },
  { name:"MOD", sig:"MOD(x, y) RETURNS INTEGER", levels:ALL,
    what:"The remainder after dividing x by y.",
    ex:'OUTPUT MOD(19, 7)\nIF MOD(8, 2) = 0 THEN\n    OUTPUT "8 is even"\nENDIF', out:"5\n8 is even",
    miss:"MOD(N, 2) = 0 is how you test for even. Learn that one by heart." },
  { name:"&", sig:'"one" & "two"', levels:ALL,
    what:"Joins two strings into one value. Use it when you need a single combined string; use commas in OUTPUT when you just want things printed together.",
    ex:'DECLARE First, Last, Full : STRING\nFirst <- "Ada"\nLast <- "Lovelace"\nFull <- First & " " & Last\nOUTPUT Full', out:"Ada Lovelace",
    miss:"+ adds numbers. It does not join text." }
]},

/* -------------------------------------------------------------- */
{ group:"Comparison and logic", entries:[
  { name:"=  <>", sig:"A = B     A <> B", levels:ALL,
    what:"Equal to, and not equal to.",
    ex:'DECLARE N : INTEGER\nN <- 5\nIF N = 5 THEN\n    OUTPUT "five"\nENDIF\nIF N <> 6 THEN\n    OUTPUT "not six"\nENDIF', out:"five\nnot six",
    miss:"Not-equal is <>. It is never != and never /= - those belong to other languages and are not credited." },
  { name:"<  <=  >  >=", sig:"A >= B", levels:ALL,
    what:"Less than, at most, greater than, at least. Read the question's wording exactly: \"80 or more\" is >= 80, \"more than 80\" is > 80.",
    ex:'DECLARE M : INTEGER\nM <- 80\nIF M >= 80 THEN\n    OUTPUT "grade A"\nENDIF\nIF M > 80 THEN\n    OUTPUT "never printed"\nENDIF', out:"grade A" },
  { name:"AND", sig:"condition AND condition", levels:ALL,
    what:"True only when both sides are true.",
    ex:'DECLARE Age : INTEGER\nAge <- 15\nIF Age >= 13 AND Age <= 19 THEN\n    OUTPUT "Teenager"\nENDIF', out:"Teenager" },
  { name:"OR", sig:"condition OR condition", levels:ALL,
    what:"True when at least one side is true.",
    ex:'DECLARE M : INTEGER\nM <- 120\nIF M < 0 OR M > 100 THEN\n    OUTPUT "Out of range"\nENDIF', out:"Out of range" },
  { name:"NOT", sig:"NOT condition", levels:ALL,
    what:"Reverses a condition.",
    ex:'DECLARE Done : BOOLEAN\nDone <- FALSE\nIF NOT Done THEN\n    OUTPUT "Still going"\nENDIF', out:"Still going" }
]},

/* -------------------------------------------------------------- */
{ group:"Selection", entries:[
  { name:"IF ... ENDIF", sig:"IF condition THEN\n    statements\nENDIF", levels:ALL,
    what:"Do something only when the condition holds. THEN sits on the same line as IF. ENDIF is not optional.",
    ex:'DECLARE M : INTEGER\nM <- 72\nIF M >= 50 THEN\n    OUTPUT "Pass"\nENDIF', out:"Pass" },
  { name:"IF ... ELSE", sig:"IF condition THEN\n    statements\nELSE\n    statements\nENDIF", levels:ALL,
    what:"Two-way choice.",
    ex:'DECLARE M : INTEGER\nM <- 31\nIF M >= 50 THEN\n    OUTPUT "Pass"\nELSE\n    OUTPUT "Fail"\nENDIF', out:"Fail" },
  { name:"Nested IF", sig:"IF ... ELSE IF ... ENDIF ENDIF", levels:ALL,
    what:"For bands of a value - grade boundaries, tax bands, postage. Order them from one end so each test needs only one comparison.",
    ex:'DECLARE M : INTEGER\nDECLARE G : CHAR\nM <- 74\nIF M >= 80 THEN\n    G <- \'A\'\nELSE\n    IF M >= 70 THEN\n        G <- \'B\'\n    ELSE\n        G <- \'F\'\n    ENDIF\nENDIF\nOUTPUT G', out:"B" },
  { name:"CASE OF", sig:"CASE OF Identifier\n    value : statement\n    OTHERWISE : statement\nENDCASE", levels:ALL,
    what:"Compares ONE variable against a list of specific values. Shorter than a stack of IFs when a question gives you a numbered menu.",
    ex:'DECLARE Choice : INTEGER\nChoice <- 2\nCASE OF Choice\n    1 : OUTPUT "Borrow"\n    2 : OUTPUT "Return"\n    3 : OUTPUT "Search"\n    OTHERWISE : OUTPUT "Invalid"\nENDCASE', out:"Return",
    miss:"Leaving out OTHERWISE. It is almost always a mark on its own, and without it nothing happens on bad input." },
  { name:"CASE range", sig:"low TO high : statement", levels:ALL,
    what:"One branch of a CASE can cover a range of values.",
    ex:'DECLARE M : INTEGER\nM <- 64\nCASE OF M\n    80 TO 100 : OUTPUT "A"\n    70 TO 79  : OUTPUT "B"\n    60 TO 69  : OUTPUT "C"\n    OTHERWISE : OUTPUT "F"\nENDCASE', out:"C" }
]},

/* -------------------------------------------------------------- */
{ group:"Iteration", entries:[
  { name:"FOR ... NEXT", sig:"FOR i <- start TO end\n    statements\nNEXT i", levels:ALL,
    what:"Repeats a KNOWN number of times. Use it whenever you know the count before you start.",
    ex:'DECLARE i : INTEGER\nFOR i <- 1 TO 5\n    OUTPUT i * i\nNEXT i', out:"1\n4\n9\n16\n25",
    miss:"NEXT must name the same counter as the FOR. Crossed-over NEXT lines are a guaranteed lost mark." },
  { name:"STEP", sig:"FOR i <- start TO end STEP n", levels:ALL,
    what:"Changes the size and direction of each step. A negative step counts down.",
    ex:'DECLARE i : INTEGER\nFOR i <- 10 TO 1 STEP -3\n    OUTPUT i\nNEXT i', out:"10\n7\n4\n1" },
  { name:"WHILE ... ENDWHILE", sig:"WHILE condition DO\n    statements\nENDWHILE", levels:ALL,
    what:"Tests the condition BEFORE each pass, so the body may run zero times. Use it when the body would be wrong on empty data.",
    ex:'DECLARE N : INTEGER\nN <- 16\nWHILE N > 1 DO\n    N <- DIV(N, 2)\n    OUTPUT N\nENDWHILE', out:"8\n4\n2\n1" },
  { name:"REPEAT ... UNTIL", sig:"REPEAT\n    statements\nUNTIL condition", levels:ALL,
    what:"Tests AFTER each pass and stops when the condition becomes TRUE, so the body always runs at least once. This is what validation needs.",
    ex:'DECLARE Mark : INTEGER\nREPEAT\n    OUTPUT "Enter a mark (0 to 100): "\n    INPUT Mark\nUNTIL Mark >= 0 AND Mark <= 100\nOUTPUT "Accepted ", Mark',
    out:"Enter a mark (0 to 100): \nEnter a mark (0 to 100): \nAccepted 72", inputs:"150\n72",
    miss:"WHILE carries on while TRUE; REPEAT carries on until TRUE. Opposite senses." }
]},

/* -------------------------------------------------------------- */
{ group:"String library", entries:[
  { name:"LENGTH", sig:"LENGTH(ThisString : STRING) RETURNS INTEGER", levels:ALL,
    what:"How many characters are in the string. Use it as the upper bound when you walk a string.",
    ex:'OUTPUT LENGTH("Computer")\nOUTPUT LENGTH("")', out:"8\n0" },
  { name:"SUBSTRING", sig:"SUBSTRING(ThisString : STRING, Start : INTEGER, Length : INTEGER) RETURNS STRING", levels:["igcse"],
    what:"Takes Length characters from ThisString, beginning at position Start. Characters are counted from 1.",
    ex:'OUTPUT SUBSTRING("PROGRAMMING", 4, 3)', out:"GRA",
    miss:"The third argument is HOW MANY characters, not where to stop." },
  { name:"MID", sig:"MID(ThisString : STRING, Start : INTEGER, Length : INTEGER) RETURNS STRING", levels:AL,
    what:"The A Level name for the same thing SUBSTRING does at IGCSE. Takes Length characters starting at Start, counting from 1.",
    ex:'OUTPUT MID("PROGRAMMING", 4, 3)', out:"GRA",
    miss:"The third argument is a length, not an end position." },
  { name:"LEFT", sig:"LEFT(ThisString : STRING, x : INTEGER) RETURNS STRING", levels:AL,
    what:"The first x characters. Handy for testing how a line begins.",
    ex:'DECLARE Line : STRING\nLine <- "ERROR disk full"\nIF LEFT(Line, 5) = "ERROR" THEN\n    OUTPUT "an error line"\nENDIF', out:"an error line" },
  { name:"RIGHT", sig:"RIGHT(ThisString : STRING, x : INTEGER) RETURNS STRING", levels:AL,
    what:"The last x characters.",
    ex:'OUTPUT RIGHT("Computer", 3)', out:"ter" },
  { name:"UCASE", sig:"UCASE(ThisString : STRING) RETURNS STRING", levels:["igcse"],
    what:"The string with every letter in upper case. Fold the case once before a loop, not inside it.",
    ex:'OUTPUT UCASE("Engineer")', out:"ENGINEER" },
  { name:"LCASE", sig:"LCASE(ThisString : STRING) RETURNS STRING", levels:["igcse"],
    what:"The string with every letter in lower case.",
    ex:'OUTPUT LCASE("Engineer")', out:"engineer" },
  { name:"TO_UPPER", sig:"TO_UPPER(ThisString : STRING) RETURNS STRING", levels:AL,
    what:"The A Level name for UCASE. Converts to upper case.",
    ex:'OUTPUT TO_UPPER("Engineer")', out:"ENGINEER",
    miss:"Comparing against five vowels instead of ten is why you fold case first." },
  { name:"TO_LOWER", sig:"TO_LOWER(ThisString : STRING) RETURNS STRING", levels:AL,
    what:"The A Level name for LCASE. Converts to lower case.",
    ex:'OUTPUT TO_LOWER("Engineer")', out:"engineer" }
]},

/* -------------------------------------------------------------- */
{ group:"Conversion and characters", entries:[
  { name:"NUM_TO_STRING", sig:"NUM_TO_STRING(x : REAL) RETURNS STRING", levels:AL,
    what:"Turns a number into text so it can be joined with & or written to a file.",
    ex:'DECLARE S : STRING\nS <- "Score: " & NUM_TO_STRING(42)\nOUTPUT S', out:"Score: 42" },
  { name:"STRING_TO_NUM", sig:"STRING_TO_NUM(s : STRING) RETURNS REAL", levels:AL,
    what:"Turns text into a number. Everything read from a text file arrives as a STRING, so you will need this constantly.",
    ex:'DECLARE T : INTEGER\nT <- STRING_TO_NUM("42") + 8\nOUTPUT T', out:"50",
    miss:"Test doubtful text with IS_NUM first, or it stops the program." },
  { name:"IS_NUM", sig:"IS_NUM(s : STRING) RETURNS BOOLEAN", levels:AL,
    what:"TRUE when the text could be converted to a number. Use it to guard STRING_TO_NUM, and to spot digits inside a string.",
    ex:'OUTPUT IS_NUM("42")\nOUTPUT IS_NUM("forty")', out:"TRUE\nFALSE" },
  { name:"ASC", sig:"ASC(ThisChar : CHAR) RETURNS INTEGER", levels:AL,
    what:"The character code of one character. Capital A is 65, lower-case a is 97.",
    ex:"OUTPUT ASC('A')\nOUTPUT ASC('a')", out:"65\n97" },
  { name:"CHR", sig:"CHR(x : INTEGER) RETURNS CHAR", levels:AL,
    what:"The character with that code. ASC and CHR are opposites, which is how letter-shifting ciphers are written.",
    ex:"OUTPUT CHR(66)\nOUTPUT CHR(ASC('A') + 2)", out:"B\nC" }
]},

/* -------------------------------------------------------------- */
{ group:"Numeric library", entries:[
  { name:"ROUND", sig:"ROUND(Value : REAL, Places : INTEGER) RETURNS REAL", levels:["igcse"],
    what:"Rounds to the given number of decimal places.",
    ex:'OUTPUT ROUND(3.14159, 2)\nOUTPUT ROUND(2.5, 0)', out:"3.14\n3" },
  { name:"INT", sig:"INT(x : REAL) RETURNS INTEGER", levels:AL,
    what:"Throws the fractional part away. It does not round - INT(7.9) is 7, not 8.",
    ex:'OUTPUT INT(7.9)\nOUTPUT INT(-2.3)', out:"7\n-2" },
  { name:"RANDOM", sig:"RANDOM() RETURNS REAL", levels:["igcse"],
    what:"A random REAL from 0 up to but not including 1. Scale it for a range: INT(RANDOM() * 6) + 1 gives a dice roll.",
    ex:'DECLARE R : REAL\nR <- RANDOM()\nIF R >= 0 AND R < 1 THEN\n    OUTPUT "in range"\nENDIF', out:"in range" },
  { name:"RAND", sig:"RAND(x : INTEGER) RETURNS REAL", levels:AL,
    what:"A random REAL from 0 up to but not including x.",
    ex:'DECLARE R : REAL\nR <- RAND(10)\nIF R >= 0 AND R < 10 THEN\n    OUTPUT "in range"\nENDIF', out:"in range" }
]},

/* -------------------------------------------------------------- */
{ group:"Procedures and functions", entries:[
  { name:"PROCEDURE", sig:"PROCEDURE Name(p : TYPE)\n    statements\nENDPROCEDURE", levels:ALL,
    what:"A named routine that DOES something. It gives no value back.",
    ex:'PROCEDURE ShowLine(Text : STRING, Times : INTEGER)\n    DECLARE i : INTEGER\n    FOR i <- 1 TO Times\n        OUTPUT Text\n    NEXT i\nENDPROCEDURE\n\nCALL ShowLine("hi", 2)', out:"hi\nhi" },
  { name:"CALL", sig:"CALL Name(arguments)", levels:ALL,
    what:"Invokes a procedure. The brackets stay even when there are no parameters.",
    ex:'PROCEDURE Header()\n    OUTPUT "=== Report ==="\nENDPROCEDURE\n\nCALL Header()', out:"=== Report ===",
    miss:"Functions do NOT take CALL - they return a value, so they go inside an expression." },
  { name:"FUNCTION", sig:"FUNCTION Name(p : TYPE) RETURNS TYPE\n    RETURN value\nENDFUNCTION", levels:ALL,
    what:"A named routine that CALCULATES and gives a value back. If the result has to be used in an assignment or an expression, it must be a function.",
    ex:'FUNCTION Area(W : REAL, H : REAL) RETURNS REAL\n    RETURN W * H\nENDFUNCTION\n\nOUTPUT Area(4.0, 2.5)', out:"10",
    miss:"Three marks live on the header alone: FUNCTION, the typed parameter list, and RETURNS. Write the header and ENDFUNCTION before the logic." },
  { name:"RETURN", sig:"RETURN value", levels:ALL,
    what:"Sends the answer back and leaves the function immediately.",
    ex:'FUNCTION Bigger(A : INTEGER, B : INTEGER) RETURNS INTEGER\n    IF A > B THEN\n        RETURN A\n    ELSE\n        RETURN B\n    ENDIF\nENDFUNCTION\n\nOUTPUT Bigger(3, 9)', out:"9" },
  { name:"BYVAL", sig:"PROCEDURE P(BYVAL N : INTEGER)", levels:AL,
    what:"The routine receives a COPY. Changing it inside has no effect outside. This is the default and the safer choice.",
    ex:'PROCEDURE TryChange(BYVAL N : INTEGER)\n    N <- 999\nENDPROCEDURE\n\nDECLARE V : INTEGER\nV <- 5\nCALL TryChange(V)\nOUTPUT V', out:"5" },
  { name:"BYREF", sig:"PROCEDURE P(BYREF N : INTEGER)", levels:AL,
    what:"The routine works on the ORIGINAL variable, so changes reach the caller. This is how a procedure sends results back, and how you return more than one answer.",
    ex:'PROCEDURE Swap(BYREF A : INTEGER, BYREF B : INTEGER)\n    DECLARE T : INTEGER\n    T <- A\n    A <- B\n    B <- T\nENDPROCEDURE\n\nDECLARE X, Y : INTEGER\nX <- 3\nY <- 8\nCALL Swap(X, Y)\nOUTPUT X, " ", Y', out:"8 3" },
  { name:"Recursion", sig:"a function that calls itself", levels:A2,
    what:"A function that calls itself on a SMALLER problem, plus a base case that returns without recursing. Without the base case it never stops.",
    ex:'FUNCTION Factorial(N : INTEGER) RETURNS INTEGER\n    IF N <= 1 THEN\n        RETURN 1\n    ELSE\n        RETURN N * Factorial(N - 1)\n    ENDIF\nENDFUNCTION\n\nOUTPUT Factorial(6)', out:"720" }
]},

/* -------------------------------------------------------------- */
{ group:"File handling", entries:[
  { name:"OPENFILE ... FOR READ", sig:'OPENFILE "name.txt" FOR READ', levels:ALL,
    what:"Opens a file so it can be read from the beginning.",
    ex:'DECLARE L : STRING\nOPENFILE "notes.txt" FOR READ\nREADFILE "notes.txt", L\nCLOSEFILE "notes.txt"\nOUTPUT L',
    out:"first line", files:[{name:"notes.txt", lines:["first line","second line"]}] },
  { name:"OPENFILE ... FOR WRITE", sig:'OPENFILE "name.txt" FOR WRITE', levels:ALL,
    what:"Opens a file for writing. This DESTROYS everything already in it.",
    ex:'OPENFILE "out.txt" FOR WRITE\nWRITEFILE "out.txt", "fresh"\nCLOSEFILE "out.txt"\nOUTPUT "written"', out:"written",
    miss:'If a question says "add a record", the answer is APPEND. FOR WRITE loses the file.' },
  { name:"OPENFILE ... FOR APPEND", sig:'OPENFILE "name.txt" FOR APPEND', levels:AL,
    what:"Opens a file to add to the END, keeping what is already there.",
    ex:'DECLARE L : STRING\nDECLARE C : INTEGER\nC <- 0\nOPENFILE "m.txt" FOR APPEND\nWRITEFILE "m.txt", "Lena"\nCLOSEFILE "m.txt"\nOPENFILE "m.txt" FOR READ\nWHILE NOT EOF("m.txt") DO\n    READFILE "m.txt", L\n    C <- C + 1\nENDWHILE\nCLOSEFILE "m.txt"\nOUTPUT C, " names"',
    out:"3 names", files:[{name:"m.txt", lines:["Amara","Ravi"]}] },
  { name:"READFILE", sig:'READFILE "name.txt", Variable', levels:ALL,
    what:"Reads the next line into the variable. It arrives as a STRING, so convert it if you need a number.",
    ex:'DECLARE L : STRING\nDECLARE T : INTEGER\nOPENFILE "n.txt" FOR READ\nREADFILE "n.txt", L\nCLOSEFILE "n.txt"\nT <- STRING_TO_NUM(L) * 2\nOUTPUT T',
    out:"84", files:[{name:"n.txt", lines:["42"]}] },
  { name:"WRITEFILE", sig:'WRITEFILE "name.txt", Data', levels:ALL,
    what:"Writes one line to an open file.",
    ex:'DECLARE L : STRING\nOPENFILE "w.txt" FOR WRITE\nWRITEFILE "w.txt", "hello"\nCLOSEFILE "w.txt"\nOPENFILE "w.txt" FOR READ\nREADFILE "w.txt", L\nCLOSEFILE "w.txt"\nOUTPUT L', out:"hello" },
  { name:"EOF", sig:'EOF("name.txt") RETURNS BOOLEAN', levels:ALL,
    what:"TRUE once there is nothing left to read. The WHILE NOT EOF loop is the single most examined file pattern there is.",
    ex:'DECLARE L : STRING\nDECLARE C : INTEGER\nC <- 0\nOPENFILE "log.txt" FOR READ\nWHILE NOT EOF("log.txt") DO\n    READFILE "log.txt", L\n    C <- C + 1\nENDWHILE\nCLOSEFILE "log.txt"\nOUTPUT C, " lines"',
    out:"3 lines", files:[{name:"log.txt", lines:["a","b","c"]}],
    miss:"It must be WHILE, not REPEAT - an empty file has to read zero lines." },
  { name:"CLOSEFILE", sig:'CLOSEFILE "name.txt"', levels:ALL,
    what:"Closes the file. Forgetting it is a standard lost mark, and this checker warns you about it.",
    ex:'OPENFILE "c.txt" FOR WRITE\nWRITEFILE "c.txt", "x"\nCLOSEFILE "c.txt"\nOUTPUT "closed properly"', out:"closed properly" }
]},

/* -------------------------------------------------------------- */
{ group:"Records and user-defined types", entries:[
  { name:"TYPE ... ENDTYPE", sig:"TYPE Name\n    DECLARE Field : TYPE\nENDTYPE", levels:A2,
    what:"Defines a RECORD: several fields of DIFFERENT types describing one thing. An array holds many values of one type; a record holds one thing with many types.",
    ex:'TYPE Student\n    DECLARE Name    : STRING\n    DECLARE Average : REAL\nENDTYPE\n\nDECLARE Pupil : Student\nPupil.Name <- "Amara"\nPupil.Average <- 74.5\nOUTPUT Pupil.Name, " scored ", Pupil.Average', out:"Amara scored 74.5" },
  { name:"Array of records", sig:"DECLARE A : ARRAY[1:n] OF RecordType", levels:A2,
    what:"A table of data, one record per row. This is the combination questions really want.",
    ex:'TYPE Book\n    DECLARE Title  : STRING\n    DECLARE OnLoan : BOOLEAN\nENDTYPE\n\nDECLARE Shelf : ARRAY[1:3] OF Book\nDECLARE i, Out : INTEGER\nShelf[1].Title <- "A"\nShelf[1].OnLoan <- TRUE\nShelf[2].OnLoan <- FALSE\nShelf[3].OnLoan <- TRUE\nOut <- 0\nFOR i <- 1 TO 3\n    IF Shelf[i].OnLoan THEN\n        Out <- Out + 1\n    ENDIF\nNEXT i\nOUTPUT Out, " on loan"', out:"2 on loan" },
  { name:"Enumerated type", sig:"TYPE Name = (value, value, ...)", levels:A2,
    what:"A type whose values are a fixed list of names. The names are written without quotes - they are not strings.",
    ex:'TYPE TDay = (Monday, Tuesday, Wednesday)\nDECLARE Today : TDay\nToday <- Tuesday\nIF Today = Tuesday THEN\n    OUTPUT "it is Tuesday"\nENDIF', out:"it is Tuesday" }
]},

/* -------------------------------------------------------------- */
{ group:"Classes and objects", entries:[
  { name:"CLASS ... ENDCLASS", sig:"CLASS Name\n    PRIVATE Attr : TYPE\n    PUBLIC PROCEDURE NEW(...)\nENDCLASS", levels:A2,
    what:"Groups data AND the operations on it, then hides the data so nothing outside can corrupt it. That hiding is encapsulation, and it is the point of the whole topic.",
    ex:'CLASS Counter\n    PRIVATE Total : INTEGER\n\n    PUBLIC PROCEDURE NEW()\n        Total <- 0\n    ENDPROCEDURE\n\n    PUBLIC PROCEDURE Add(N : INTEGER)\n        IF N > 0 THEN\n            Total <- Total + N\n        ENDIF\n    ENDPROCEDURE\n\n    PUBLIC FUNCTION GetTotal() RETURNS INTEGER\n        RETURN Total\n    ENDFUNCTION\nENDCLASS\n\nDECLARE C : Counter\nC <- NEW Counter()\nCALL C.Add(5)\nCALL C.Add(-3)\nOUTPUT C.GetTotal()', out:"5" },
  { name:"PRIVATE", sig:"PRIVATE Attribute : TYPE", levels:A2,
    what:"An attribute only the class's own methods can touch. A mark scheme will say \"attributes declared private\" - it is not a style preference.",
    ex:'CLASS Acc\n    PRIVATE Bal : REAL\n    PUBLIC PROCEDURE NEW(B : REAL)\n        Bal <- B\n    ENDPROCEDURE\n    PUBLIC FUNCTION GetBal() RETURNS REAL\n        RETURN Bal\n    ENDFUNCTION\nENDCLASS\n\nDECLARE A : Acc\nA <- NEW Acc(250.0)\nOUTPUT A.GetBal()', out:"250",
    miss:"Reading A.Bal from outside is refused. Go through the getter - that is what it is for." },
  { name:"NEW (constructor)", sig:"PUBLIC PROCEDURE NEW(params)", levels:A2,
    what:"The constructor. Always a procedure, always called NEW. It sets the attributes up when the object is created.",
    ex:'CLASS P\n    PRIVATE N : STRING\n    PUBLIC PROCEDURE NEW(Name : STRING)\n        N <- Name\n    ENDPROCEDURE\n    PUBLIC FUNCTION Get() RETURNS STRING\n        RETURN N\n    ENDFUNCTION\nENDCLASS\n\nDECLARE Obj : P\nObj <- NEW P("Sofia")\nOUTPUT Obj.Get()', out:"Sofia" },
  { name:"INHERITS", sig:"CLASS Sub INHERITS Super", levels:A2,
    what:"The subclass gains everything the superclass has, then adds or replaces. Use SUPER.NEW to let the parent set up its own part first.",
    ex:'CLASS Shape\n    PRIVATE Name : STRING\n    PUBLIC PROCEDURE NEW(N : STRING)\n        Name <- N\n    ENDPROCEDURE\n    PUBLIC FUNCTION GetName() RETURNS STRING\n        RETURN Name\n    ENDFUNCTION\nENDCLASS\n\nCLASS Square INHERITS Shape\n    PRIVATE Side : REAL\n    PUBLIC PROCEDURE NEW(S : REAL)\n        CALL SUPER.NEW("square")\n        Side <- S\n    ENDPROCEDURE\n    PUBLIC FUNCTION Area() RETURNS REAL\n        RETURN Side * Side\n    ENDFUNCTION\nENDCLASS\n\nDECLARE Sq : Square\nSq <- NEW Square(3.0)\nOUTPUT Sq.GetName(), " of area ", Sq.Area()', out:"square of area 9" },
  { name:"Calling methods", sig:"CALL Obj.Proc()   /   Obj.Func()", levels:A2,
    what:"A procedure method needs CALL. A function method does not, because it gives a value back and is used inside an expression.",
    ex:'CLASS T\n    PRIVATE V : INTEGER\n    PUBLIC PROCEDURE NEW()\n        V <- 0\n    ENDPROCEDURE\n    PUBLIC PROCEDURE Set(N : INTEGER)\n        V <- N\n    ENDPROCEDURE\n    PUBLIC FUNCTION Get() RETURNS INTEGER\n        RETURN V\n    ENDFUNCTION\nENDCLASS\n\nDECLARE O : T\nO <- NEW T()\nCALL O.Set(7)\nOUTPUT O.Get()', out:"7",
    miss:"Mixing these up is one of the most common Paper 4 slips." }
]}

];

/* ============================================================================
   DIALECT MAP - IGCSE 0478 against AS/A Level 9618
   ========================================================================== */
__g.DIALECT_MAP = [
  ["Substring",           "SUBSTRING(s, start, len)", "MID(s, start, len)",   "Identical behaviour, different name."],
  ["Upper case",          "UCASE(s)",                 "TO_UPPER(s)",          "Identical behaviour, different name."],
  ["Lower case",          "LCASE(s)",                 "TO_LOWER(s)",          "Identical behaviour, different name."],
  ["First / last letters","SUBSTRING(s, 1, n)",       "LEFT(s, n) / RIGHT(s, n)", "IGCSE has no LEFT or RIGHT - use SUBSTRING."],
  ["Rounding",            "ROUND(v, places)",         "INT(x)",               "ROUND rounds to decimal places; INT just discards the fraction."],
  ["Random number",       "RANDOM()",                 "RAND(x)",              "RANDOM gives 0 to 1; RAND gives 0 to x."],
  ["Constants",           "CONSTANT N <- 10",         "CONSTANT N = 10",      "The arrow is common in IGCSE material; 9618 uses the equals sign."],
  ["File modes",          "READ, WRITE",              "READ, WRITE, APPEND, RANDOM", "APPEND and random access are A Level only."],
  ["Parameters",          "PROCEDURE P(N : INTEGER)", "BYVAL / BYREF",        "IGCSE does not define passing modes."],
  ["Records",             "not in the syllabus",      "TYPE ... ENDTYPE",     "A Level only."],
  ["Classes",             "not in the syllabus",      "CLASS ... ENDCLASS",   "A Level Paper 4 only."],
  ["Recursion",           "not in the syllabus",      "a function calling itself", "A Level Paper 4 only."]
];

/* ============================================================================
   SNIPPETS - the patterns you half-remember mid-question
   ========================================================================== */
__g.SNIPPETS = [
  { name:"Total and count an array", levels:ALL, what:"The shape behind almost every array question.",
    code:'Total <- 0\nCount <- 0\n\nFOR i <- 1 TO 30\n    Total <- Total + Scores[i]\n    Count <- Count + 1\nNEXT i\n\nIF Count > 0 THEN\n    OUTPUT "Average: ", Total / Count\nENDIF' },
  { name:"Largest and where it is", levels:ALL, what:"Start from the first element, never from zero - every value could be negative.",
    code:'Highest  <- Scores[1]\nPosition <- 1\n\nFOR i <- 2 TO 30\n    IF Scores[i] > Highest THEN      // > keeps the FIRST occurrence\n        Highest  <- Scores[i]\n        Position <- i\n    ENDIF\nNEXT i' },
  { name:"Validate an input", levels:ALL, what:"You have to ask once before you can judge the answer, so it is REPEAT.",
    code:'REPEAT\n    OUTPUT "Enter a mark (0 to 100): "\n    INPUT Mark\n    IF Mark < 0 OR Mark > 100 THEN\n        OUTPUT "Not valid."\n    ENDIF\nUNTIL Mark >= 0 AND Mark <= 100' },
  { name:"Read until a sentinel", levels:ALL, what:"Read once before the loop (a priming read), then read again at the bottom.",
    code:'Total <- 0\n\nOUTPUT "Enter a value (-1 to finish): "\nINPUT Value                      // priming read\n\nWHILE Value <> -1 DO\n    Total <- Total + Value\n    OUTPUT "Enter a value (-1 to finish): "\n    INPUT Value\nENDWHILE' },
  { name:"Linear search with early exit", levels:ALL, what:"The flag is what lets the loop stop the moment it finds the answer.",
    code:'Index <- 1\nFound <- FALSE\n\nWHILE Index <= 200 AND Found = FALSE DO\n    IF Names[Index] = Target THEN\n        Found <- TRUE\n    ELSE\n        Index <- Index + 1        // only move on if it did NOT match\n    ENDIF\nENDWHILE' },
  { name:"Swap two values", levels:ALL, what:"Three lines and a temporary. Two lines cannot do it - the first would destroy the value you still need.",
    code:'Temp <- A\nA    <- B\nB    <- Temp' },
  { name:"Bubble sort", levels:ALL, what:"Ascending. Swap the comparison to < for descending order.",
    code:'FOR Pass <- 1 TO 29\n    FOR i <- 1 TO 30 - Pass          // the tail is already sorted\n        IF Scores[i] > Scores[i + 1] THEN\n            Temp          <- Scores[i]\n            Scores[i]     <- Scores[i + 1]\n            Scores[i + 1] <- Temp\n        ENDIF\n    NEXT i\nNEXT Pass' },
  { name:"Walk a string", levels:ALL, what:"Fold the case once, outside the loop, then test each character.",
    code:'Count <- 0\nUpper <- UCASE(Text)             // TO_UPPER at A Level\n\nFOR i <- 1 TO LENGTH(Upper)\n    Ch <- SUBSTRING(Upper, i, 1)  // MID at A Level\n    IF Ch = \'A\' OR Ch = \'E\' OR Ch = \'I\' OR Ch = \'O\' OR Ch = \'U\' THEN\n        Count <- Count + 1\n    ENDIF\nNEXT i' },
  { name:"Read a whole file", levels:ALL, what:"WHILE, never REPEAT - an empty file must read nothing.",
    code:'OPENFILE "Data.txt" FOR READ\n\nWHILE NOT EOF("Data.txt") DO\n    READFILE "Data.txt", Line\n    OUTPUT Line\nENDWHILE\n\nCLOSEFILE "Data.txt"' },
  { name:"Total each row of a grid", levels:ALL, what:"Reset the running total INSIDE the outer loop, once per row.",
    code:'FOR Row <- 1 TO 5\n    RowTotal <- 0                 // reset per row, not before the loop\n    FOR Col <- 1 TO 12\n        RowTotal <- RowTotal + Sales[Row, Col]\n    NEXT Col\n    OUTPUT "Row ", Row, ": ", RowTotal\nNEXT Row' },
  { name:"Binary search", levels:AL, what:"Only on a sorted array. The +1 and -1 are what stop it looping forever.",
    code:'Low   <- 1\nHigh  <- 1000\nFound <- FALSE\n\nWHILE Low <= High AND Found = FALSE DO\n    Mid <- DIV(Low + High, 2)\n    IF Sorted[Mid] = Target THEN\n        Found <- TRUE\n    ELSE\n        IF Sorted[Mid] < Target THEN\n            Low <- Mid + 1\n        ELSE\n            High <- Mid - 1\n        ENDIF\n    ENDIF\nENDWHILE' }
];
