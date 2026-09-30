/* "Your turn" exercises for Assignment Arrow's A Level lessons (L1-L13), for
   your own copies only (see arrow/lab.js). Each lesson's exercises come after
   its teaching and before the check it already ends with.

   Types:
     predict  code (+ inputs, files)        you write what it outputs; checked by running it
     fill     code with {{answer|other}}     you fill the gaps; checked, then run
     write    model (+ tests, setup,         you write it; checked against the model answer
              harness, files, require)       on each set of inputs, words not counted
     mcq      options + answer (+ code)

   Every exercise is run by test/lab.test.mjs, so a model answer that stops
   working, or a prediction that errors, fails the tests. Keep it ASCII:
   HTML entities in the text, <- for the arrow in code. */
"use strict";
var __g = (typeof window !== "undefined") ? window : globalThis;

__g.LESSONS_PLUS = {

L1: [
  { type: "mcq", q: "Which line puts one more into <code>Total</code>, the way the mark scheme wants it?",
    options: ["<code>Total = Total + 1</code>", "<code>Total &lt;- Total + 1</code>", "<code>Total == Total + 1</code>", "<code>SET Total TO Total + 1</code>"],
    answer: 1, why: "The arrow stores a value. <code>=</code> only ever compares, inside a condition." },
  { type: "fill", q: "Fill the gaps: count up to 3, with the arrow and a closed loop.",
    code: "DECLARE Count : INTEGER\nCount {{<-}} 0\n{{WHILE}} Count < 3 DO\n    Count <- Count + 1\n{{ENDWHILE}}\nOUTPUT Count",
    why: "Every WHILE is closed by ENDWHILE, and the body between them is indented." },
  { type: "predict", q: "What does this output?",
    code: "DECLARE X : INTEGER\nX <- 4\nIF X = 4 THEN\n    X <- X + 1\nENDIF\nOUTPUT X",
    why: "Inside the IF, <code>=</code> compares (4 = 4 is TRUE); the arrow on the next line changes X." },
  { type: "mcq", q: "Which identifier follows the naming rule for your own names?",
    options: ["<code>studentname</code>", "<code>STUDENTNAME</code>", "<code>StudentName</code>", "<code>student_name_1</code>"],
    answer: 2, why: "Capitals are for keywords. Your own names are CamelCase: a capital at the start of each word." }
],

L2: [
  { type: "mcq", q: "A weight in kilograms to one decimal place, like 68.4, should be declared as&hellip;",
    options: ["INTEGER", "REAL", "STRING", "CHAR"], answer: 1,
    why: "It has a fractional part, so it is REAL. INTEGER holds whole numbers only." },
  { type: "fill", q: "Fill the gaps: declare the variables and the constant.",
    code: "{{DECLARE}} Name : {{STRING}}\nDECLARE Age : {{INTEGER}}\n{{CONSTANT}} MaxAge = 120\nName <- \"Ada\"\nAge <- 17\nOUTPUT Name, \" is \", Age",
    why: "DECLARE for anything that changes, CONSTANT for a value that never does." },
  { type: "predict", q: "What does this output? (Two lines.)",
    code: "DECLARE A : INTEGER\nDECLARE B : INTEGER\nA <- 3\nB <- A\nA <- 10\nOUTPUT A\nOUTPUT B",
    why: "B got a copy of A's value at that moment. Changing A afterwards does not change B." },
  { type: "write", q: "A delivery fee of 4.50 never changes. Declare it as a constant called <code>Fee</code>, and a REAL variable <code>Total</code>. Set <code>Total</code> to 20, add the fee to it, and output <code>Total</code>.",
    starter: "// your declarations, then the three steps\n",
    model: "CONSTANT Fee = 4.5\nDECLARE Total : REAL\nTotal <- 20\nTotal <- Total + Fee\nOUTPUT Total",
    require: [{ re: "CONSTANT", t: "a CONSTANT for the fee" }, { re: "DECLARE\\s+TOTAL\\s*:\\s*REAL", t: "Total declared as REAL" }] }
],

L3: [
  { type: "predict", q: "What does this output? (Three lines.)",
    code: "OUTPUT DIV(17, 5)\nOUTPUT MOD(17, 5)\nOUTPUT 17 / 5",
    why: "DIV is how many whole 5s fit (3), MOD is what is left over (2), and / gives the exact answer." },
  { type: "fill", q: "Fill the gaps: 135 seconds as minutes and seconds.",
    code: "DECLARE Total : INTEGER\nTotal <- 135\nOUTPUT {{DIV}}(Total, 60), \" min \", {{MOD}}(Total, 60), \" s\"",
    why: "The same pair splits any amount into units and remainder: hours and minutes, pounds and pence." },
  { type: "write", q: "Input a whole number of pence and output it as pounds and pence, for example <code>3 pounds 45 pence</code>. Your prompt can say what you like.",
    starter: "DECLARE Pence : INTEGER\n",
    model: "DECLARE Pence : INTEGER\nOUTPUT \"Enter the amount in pence: \"\nINPUT Pence\nOUTPUT DIV(Pence, 100), \" pounds \", MOD(Pence, 100), \" pence\"",
    tests: [{ inputs: ["345"] }, { inputs: ["99"] }, { inputs: ["1200"] }],
    require: [{ re: "DIV\\s*\\(", t: "DIV" }, { re: "MOD\\s*\\(", t: "MOD" }, { re: "INPUT", t: "INPUT" }] },
  { type: "predict", q: "What does this output? (Two lines.)",
    code: "DECLARE Age : INTEGER\nAge <- 20\nOUTPUT (Age >= 13) AND (Age <= 19)\nOUTPUT \"Age: \" & NUM_TO_STRING(Age)",
    why: "20 is not &le; 19, so the AND is FALSE. <code>&amp;</code> joins strings, so the number is converted first." }
],

L4: [
  { type: "predict", q: "What does this output?",
    code: "DECLARE Mark : INTEGER\nMark <- 64\nIF Mark >= 70 THEN\n    OUTPUT \"A\"\nELSE\n    IF Mark >= 60 THEN\n        OUTPUT \"B\"\n    ELSE\n        OUTPUT \"C\"\n    ENDIF\nENDIF",
    why: "64 fails the first test, passes the second: B. Test the highest band first and work down." },
  { type: "fill", q: "Fill the gaps in the CASE statement.",
    code: "DECLARE Day : INTEGER\nDay <- 6\n{{CASE OF}} Day\n    1 TO 5 : OUTPUT \"Weekday\"\n    6 : OUTPUT \"Saturday\"\n    7 : OUTPUT \"Sunday\"\n    {{OTHERWISE}} : OUTPUT \"Not a day\"\n{{ENDCASE}}",
    why: "CASE OF ... ENDCASE, one line per value or range, and OTHERWISE catches everything else." },
  { type: "write", q: "Input a temperature (a whole number). Output <code>Freezing</code> below 0, <code>Cold</code> from 0 to 15, and <code>Warm</code> above 15.",
    starter: "DECLARE Temp : INTEGER\nOUTPUT \"Temperature: \"\nINPUT Temp\n",
    model: "DECLARE Temp : INTEGER\nOUTPUT \"Temperature: \"\nINPUT Temp\nIF Temp < 0 THEN\n    OUTPUT \"Freezing\"\nELSE\n    IF Temp <= 15 THEN\n        OUTPUT \"Cold\"\n    ELSE\n        OUTPUT \"Warm\"\n    ENDIF\nENDIF",
    tests: [{ inputs: ["-3"] }, { inputs: ["0"] }, { inputs: ["15"] }, { inputs: ["22"] }],
    require: [{ re: "(IF|CASE)", t: "a selection statement" }], why: "The boundaries (0 and 15) are where marks are lost: they are tested." },
  { type: "mcq", q: "When is CASE the better choice over IF?",
    options: ["When two conditions are joined with AND", "When one variable is compared against several separate values", "When the code must run at least once", "Never: CASE is only for strings"],
    answer: 1, why: "CASE shines when one value picks one of several branches; AND/OR conditions need IF." }
],

L5: [
  { type: "predict", q: "What does this output?",
    code: "DECLARE Total : INTEGER\nTotal <- 0\nFOR i <- 1 TO 4\n    Total <- Total + i\nNEXT i\nOUTPUT Total",
    why: "1 + 2 + 3 + 4 = 10. The loop variable takes each value from 1 to 4 in turn." },
  { type: "mcq", q: "Which loop always runs its body at least once?",
    options: ["FOR", "WHILE", "REPEAT ... UNTIL", "None of them"], answer: 2,
    why: "REPEAT tests at the end, so the body has run once before the first test. WHILE tests first." },
  { type: "fill", q: "Fill the gaps: keep asking until the number is from 1 to 10. Then run it and try a wrong number first.",
    code: "DECLARE N : INTEGER\n{{REPEAT}}\n    OUTPUT \"Enter 1 to 10: \"\n    INPUT N\n{{UNTIL}} N >= 1 AND N <= 10\nOUTPUT \"Thanks: \", N",
    why: "Validation is REPEAT's job: the question has to be asked once before it can be checked." },
  { type: "predict", q: "What does this output?",
    code: "DECLARE X : INTEGER\nX <- 10\nWHILE X < 5 DO\n    OUTPUT X\n    X <- X + 1\nENDWHILE\nOUTPUT \"done\"",
    why: "WHILE tests first: 10 &lt; 5 is FALSE, so the body never runs." },
  { type: "write", q: "Output the 7 times table from 7 x 1 to 7 x 10, one line each, like <code>7 x 3 = 21</code>.",
    model: "FOR i <- 1 TO 10\n    OUTPUT \"7 x \", i, \" = \", 7 * i\nNEXT i",
    require: [{ re: "FOR", t: "a FOR loop" }], why: "A known number of repeats is a FOR loop." }
],

L6: [
  { type: "predict", q: "What does this output?",
    code: "DECLARE Nums : ARRAY[1:5] OF INTEGER\nFOR i <- 1 TO 5\n    Nums[i] <- i * i\nNEXT i\nOUTPUT Nums[3], \" \", Nums[5]",
    why: "Each element holds its index squared: Nums[3] is 9 and Nums[5] is 25." },
  { type: "fill", q: "Fill the gaps: find the largest score.",
    code: "DECLARE Scores : ARRAY[1:5] OF INTEGER\nScores[1] <- 12\nScores[2] <- 40\nScores[3] <- 7\nScores[4] <- 33\nScores[5] <- 25\nDECLARE Max : INTEGER\nMax <- Scores[{{1}}]\nFOR i <- 2 TO {{5}}\n    IF Scores[i] {{>}} Max THEN\n        Max <- Scores[i]\n    ENDIF\nNEXT i\nOUTPUT Max",
    why: "Start with the first element, not 0, so it also works when every value is negative." },
  { type: "write", q: "<code>Names</code> already holds five names (see below; it is set up for you). Input a name and output its position in <code>Names</code>, or 0 if it is not there.",
    setup: "DECLARE Names : ARRAY[1:5] OF STRING\nNames[1] <- \"Ana\"\nNames[2] <- \"Ben\"\nNames[3] <- \"Cai\"\nNames[4] <- \"Dev\"\nNames[5] <- \"Eli\"",
    starter: "// Names[1..5] holds Ana, Ben, Cai, Dev, Eli\nDECLARE Target : STRING\n",
    model: "DECLARE Target : STRING\nDECLARE Pos : INTEGER\nOUTPUT \"Name to find: \"\nINPUT Target\nPos <- 0\nFOR i <- 1 TO 5\n    IF Names[i] = Target THEN\n        Pos <- i\n    ENDIF\nNEXT i\nOUTPUT Pos",
    tests: [{ inputs: ["Cai"] }, { inputs: ["Zed"] }, { inputs: ["Ana"] }, { inputs: ["Eli"] }],
    require: [{ re: "(FOR|WHILE|REPEAT)", t: "a loop through the array" }], rows: 9 },
  { type: "predict", q: "What does this output? (Two lines.)",
    code: "DECLARE Grid : ARRAY[1:2, 1:3] OF INTEGER\nFOR r <- 1 TO 2\n    FOR c <- 1 TO 3\n        Grid[r, c] <- r * 10 + c\n    NEXT c\nNEXT r\nOUTPUT Grid[2, 3]\nOUTPUT Grid[1, 2]",
    why: "Row first, then column: Grid[2, 3] is row 2, column 3." }
],

L7: [
  { type: "predict", q: "What does this output? (Four lines.)",
    code: "DECLARE Word : STRING\nWord <- \"Computer\"\nOUTPUT LENGTH(Word)\nOUTPUT LEFT(Word, 3)\nOUTPUT MID(Word, 4, 2)\nOUTPUT TO_UPPER(RIGHT(Word, 2))",
    why: "MID(Word, 4, 2) starts at the 4th character (p) and takes 2." },
  { type: "fill", q: "Fill the gaps: output a word backwards.",
    code: "DECLARE Word : STRING\nDECLARE Result : STRING\nWord <- \"level up\"\nResult <- \"\"\nFOR i <- {{LENGTH}}(Word) TO 1 STEP {{-1}}\n    Result <- Result {{&}} MID(Word, i, 1)\nNEXT i\nOUTPUT Result",
    why: "Count down from the last character with STEP -1, and join each one on with &amp;." },
  { type: "write", q: "Input a word and output how many times the letter <code>e</code> (either case) appears in it.",
    starter: "DECLARE Word : STRING\nOUTPUT \"Word: \"\nINPUT Word\n",
    model: "DECLARE Word : STRING\nDECLARE Count : INTEGER\nOUTPUT \"Word: \"\nINPUT Word\nCount <- 0\nFOR i <- 1 TO LENGTH(Word)\n    IF TO_LOWER(MID(Word, i, 1)) = \"e\" THEN\n        Count <- Count + 1\n    ENDIF\nNEXT i\nOUTPUT Count",
    tests: [{ inputs: ["Excellence"] }, { inputs: ["sky"] }, { inputs: ["eerie"] }],
    require: [{ re: "MID\\s*\\(", t: "MID to take one character" }, { re: "LENGTH\\s*\\(", t: "LENGTH" }], rows: 9 },
  { type: "mcq", q: "What does <code>ASC('B') - ASC('A')</code> give?",
    options: ["1", "66", "\"B\"", "An error"], answer: 0,
    why: "Character codes are consecutive: 'A' is 65 and 'B' is 66." }
],

L8: [
  { type: "predict", q: "What does this output? (Two lines.)",
    code: "PROCEDURE Change(BYVAL A : INTEGER, BYREF B : INTEGER)\n    A <- A + 1\n    B <- B + 1\nENDPROCEDURE\nDECLARE X : INTEGER\nDECLARE Y : INTEGER\nX <- 5\nY <- 5\nCALL Change(X, Y)\nOUTPUT X\nOUTPUT Y",
    why: "BYVAL gets a copy, so X stays 5. BYREF works on the caller's own variable, so Y becomes 6." },
  { type: "fill", q: "Fill the gaps in the function.",
    code: "{{FUNCTION}} Bigger(A : INTEGER, B : INTEGER) {{RETURNS}} INTEGER\n    IF A > B THEN\n        {{RETURN}} A\n    ENDIF\n    RETURN B\n{{ENDFUNCTION}}\nOUTPUT Bigger(4, 9)",
    why: "A function says what type it RETURNS in its header, and hands a value back with RETURN." },
  { type: "write", q: "Write a function <code>Cube</code> that takes an INTEGER and returns it cubed. (It is called for you: <code>Cube(3)</code>, <code>Cube(-2)</code> and <code>Cube(10)</code>.)",
    starter: "FUNCTION Cube(N : INTEGER) RETURNS INTEGER\n\nENDFUNCTION",
    model: "FUNCTION Cube(N : INTEGER) RETURNS INTEGER\n    RETURN N * N * N\nENDFUNCTION",
    harness: "OUTPUT Cube(3)\nOUTPUT Cube(-2)\nOUTPUT Cube(10)",
    require: [{ re: "FUNCTION\\s+CUBE", t: "a FUNCTION called Cube" }, { re: "RETURN\\s", t: "RETURN" }] },
  { type: "mcq", q: "Which of these can be used inside an expression, like <code>Area &lt;- Size(3, 4) * 2</code>?",
    options: ["A procedure", "A function", "Both", "Neither"], answer: 1,
    why: "A function returns a value, so it can sit in an expression. A procedure is run with CALL." }
],

L9: [
  { type: "predict", q: "Trace it, then write what it outputs.",
    code: "DECLARE A : INTEGER\nDECLARE B : INTEGER\nA <- 1\nB <- 1\nFOR i <- 1 TO 4\n    A <- A + B\n    B <- A - B\nNEXT i\nOUTPUT A",
    why: "A goes 2, 3, 5, 8: each new A is the sum of the two before (Fibonacci)." },
  { type: "predict", q: "How many steps does it take? Trace it and write the output.",
    code: "DECLARE N : INTEGER\nDECLARE Steps : INTEGER\nN <- 6\nSteps <- 0\nWHILE N <> 1 DO\n    IF MOD(N, 2) = 0 THEN\n        N <- DIV(N, 2)\n    ELSE\n        N <- 3 * N + 1\n    ENDIF\n    Steps <- Steps + 1\nENDWHILE\nOUTPUT Steps",
    why: "6, 3, 10, 5, 16, 8, 4, 2, 1: eight steps." },
  { type: "mcq", q: "What does this algorithm do?",
    code: "DECLARE N : INTEGER\nDECLARE C : INTEGER\nN <- 4096\nC <- 0\nREPEAT\n    N <- DIV(N, 10)\n    C <- C + 1\nUNTIL N = 0\nOUTPUT C",
    options: ["Adds up the digits of N", "Counts the digits of N", "Reverses N", "Finds the last digit of N"], answer: 1,
    why: "Each DIV 10 removes one digit, and C counts how many times that happens." }
],

L10: [
  { type: "fill", q: "Fill the gaps: read the whole file and output each line.",
    code: "DECLARE Line : STRING\n{{OPENFILE}} \"Names.txt\" FOR {{READ}}\nWHILE NOT {{EOF}}(\"Names.txt\") DO\n    READFILE \"Names.txt\", Line\n    OUTPUT Line\nENDWHILE\n{{CLOSEFILE}} \"Names.txt\"",
    files: [{ name: "Names.txt", lines: ["Ana", "Ben", "Cai"] }],
    why: "Open, loop until EOF, read one line per pass, close." },
  { type: "write", q: "<code>Scores.txt</code> holds one whole number per line (it is there for you). Read it all and output how many lines it has and their total, e.g. <code>5 scores, total 312</code>.",
    files: [{ name: "Scores.txt", lines: ["56", "71", "48", "90", "47"] }],
    tests: [{}, { files: [{ name: "Scores.txt", lines: ["10", "20"] }] }],
    starter: "DECLARE Line : STRING\n",
    model: "DECLARE Line : STRING\nDECLARE Count : INTEGER\nDECLARE Total : INTEGER\nCount <- 0\nTotal <- 0\nOPENFILE \"Scores.txt\" FOR READ\nWHILE NOT EOF(\"Scores.txt\") DO\n    READFILE \"Scores.txt\", Line\n    Count <- Count + 1\n    Total <- Total + STRING_TO_NUM(Line)\nENDWHILE\nCLOSEFILE \"Scores.txt\"\nOUTPUT Count, \" scores, total \", Total",
    require: [{ re: "EOF\\s*\\(", t: "an EOF loop" }, { re: "CLOSEFILE", t: "CLOSEFILE" }], rows: 10 },
  { type: "mcq", q: "You open an existing file <code>FOR WRITE</code>. What happens to what was in it?",
    options: ["It is kept, and new lines go on the end", "It is wiped: the file starts empty", "It causes an error", "Only the first line is replaced"], answer: 1,
    why: "WRITE starts the file again. To keep what is there and add to the end, open it FOR APPEND." }
],

L11: [
  { type: "fill", q: "Fill the gaps: a record type for a book.",
    code: "{{TYPE}} Book\n    DECLARE Title : STRING\n    DECLARE OnLoan : {{BOOLEAN}}\n{{ENDTYPE}}\nDECLARE B : Book\nB.Title <- \"Dune\"\nB.OnLoan <- FALSE\nOUTPUT B.Title, \" \", B.OnLoan",
    why: "TYPE ... ENDTYPE groups fields; each field is reached with a dot." },
  { type: "predict", q: "What does this output?",
    code: "TYPE Player\n    DECLARE Name : STRING\n    DECLARE Score : INTEGER\nENDTYPE\nDECLARE Team : ARRAY[1:3] OF Player\nTeam[1].Name <- \"Ana\"\nTeam[1].Score <- 12\nTeam[2].Name <- \"Ben\"\nTeam[2].Score <- 30\nTeam[3].Name <- \"Cai\"\nTeam[3].Score <- 21\nDECLARE Best : INTEGER\nBest <- 1\nFOR i <- 2 TO 3\n    IF Team[i].Score > Team[Best].Score THEN\n        Best <- i\n    ENDIF\nNEXT i\nOUTPUT Team[Best].Name",
    why: "Best keeps the index of the highest score so far; Ben's 30 wins." },
  { type: "mcq", q: "How do you reach the score of the 4th player in an array of records called <code>Team</code>?",
    options: ["<code>Team.Score[4]</code>", "<code>Team[4].Score</code>", "<code>Score.Team[4]</code>", "<code>Team[Score, 4]</code>"], answer: 1,
    why: "Index the array first to get one record, then take its field." }
],

L12: [
  { type: "predict", q: "What does this output?",
    code: "CLASS Counter\n    PRIVATE Count : INTEGER\n    PUBLIC PROCEDURE NEW()\n        Count <- 0\n    ENDPROCEDURE\n    PUBLIC PROCEDURE Add(N : INTEGER)\n        Count <- Count + N\n    ENDPROCEDURE\n    PUBLIC FUNCTION GetCount() RETURNS INTEGER\n        RETURN Count\n    ENDFUNCTION\nENDCLASS\nDECLARE C : Counter\nC <- NEW Counter()\nCALL C.Add(5)\nCALL C.Add(3)\nOUTPUT C.GetCount()",
    why: "The constructor sets Count to 0, then two calls add 5 and 3." },
  { type: "fill", q: "Fill the gaps: a class with a private attribute, a constructor and a getter.",
    code: "CLASS Pet\n    {{PRIVATE}} Name : STRING\n    PUBLIC PROCEDURE {{NEW}}(N : STRING)\n        Name <- N\n    ENDPROCEDURE\n    PUBLIC FUNCTION GetName() RETURNS STRING\n        RETURN Name\n    ENDFUNCTION\n{{ENDCLASS}}\nDECLARE P : Pet\nP <- NEW Pet(\"Rex\")\nOUTPUT P.GetName()",
    why: "Attributes are PRIVATE, so only the class's own methods can change them: that is encapsulation." },
  { type: "mcq", q: "Why is an attribute made PRIVATE and read through a getter?",
    options: ["It makes the program run faster", "Code outside the class cannot change it directly (encapsulation)", "PRIVATE attributes do not need a type", "So that it can be inherited"], answer: 1,
    why: "Encapsulation: the object controls its own data, so it can check every change." }
],

L13: [
  { type: "mcq", q: "\"Numbers are entered until a negative number is entered.\" Which loop fits?",
    options: ["A FOR loop, from 1 to the number of numbers", "A condition-controlled loop (WHILE or REPEAT)", "No loop: use IF", "A CASE statement"], answer: 1,
    why: "You do not know how many numbers there will be, so the loop is controlled by a condition." },
  { type: "write", q: "Numbers are input until a negative number is entered. Output the largest number entered (the negative one does not count). At least one number comes first.",
    starter: "DECLARE N : INTEGER\nDECLARE Largest : INTEGER\n",
    model: "DECLARE N : INTEGER\nDECLARE Largest : INTEGER\nOUTPUT \"Number: \"\nINPUT N\nLargest <- N\nWHILE N >= 0 DO\n    IF N > Largest THEN\n        Largest <- N\n    ENDIF\n    OUTPUT \"Number: \"\n    INPUT N\nENDWHILE\nOUTPUT Largest",
    tests: [{ inputs: ["5", "12", "3", "-1"] }, { inputs: ["7", "-2"] }, { inputs: ["0", "0", "4", "-9"] }],
    require: [{ re: "(WHILE|REPEAT)", t: "a condition-controlled loop" }], rows: 10,
    why: "Read one first, then loop while it is not the end marker, reading the next at the bottom." },
  { type: "mcq", q: "Step 2 of the method is \"list the data before the logic\". For the question above, which list is right?",
    options: ["N and Largest, both INTEGER", "Only N", "An array of 100 numbers", "N as STRING, Largest as REAL"], answer: 0,
    why: "One variable for the number just read, one for the best so far. No array is needed." }
]

};
