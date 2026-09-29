/* ============================================================================
   IGCSE 0478 COURSE
   Written to the Cambridge IGCSE Computer Science pseudocode conventions:
   SUBSTRING, UCASE, LCASE, ROUND, RANDOM. No records, classes or recursion -
   those are A Level and are deliberately absent.
   ========================================================================== */
"use strict";
var __g = (typeof window !== "undefined") ? window : globalThis;

__g.LESSONS_IGCSE = [
{
  id:"G1", levels:["igcse"], title:"The rules that earn marks",
  blurb:"Five mechanical habits. Get these automatic and you stop losing marks you had already earned.",
  blocks:[
    {t:"p",html:`Pseudocode is not a programming language &mdash; nothing runs it in the exam. It is a way of writing an algorithm so precisely that a programmer could turn it into working code without asking you a single question. That is the standard the examiner marks against.`},
    {t:"p",html:`In this app it <em>does</em> run, which is the point: you find out now which habits are missing, instead of in August.`},

    {t:"h",text:"Rule 1 - assignment is an arrow"},
    {t:"p",html:`<strong>&#8592;</strong> means <em>put this value into this variable</em>. <strong>=</strong> means <em>are these two things equal?</em> and belongs only inside a condition.`},
    {t:"code",src:
`Total <- 0             // correct: put 0 into Total
Total <- Total + 5     // read Total, add 5, store it back

IF Total = 5 THEN      // correct: = compares here
    OUTPUT "five"
ENDIF`},

    {t:"h",text:"Rule 2 - indent every block and close it"},
    {t:"p",html:`Statements inside a block are indented, normally four spaces. Indentation is how the examiner sees which statements are inside the loop.`},
    {t:"code",src:
`IF Mark >= 50 THEN
    OUTPUT "Pass"
ELSE
    OUTPUT "Fail"
ENDIF

FOR Count <- 1 TO 5
    OUTPUT Count
NEXT Count`},
    {t:"p",html:`Never leave one open: <em class="term">IF&hellip;ENDIF</em>, <em class="term">CASE OF&hellip;ENDCASE</em>, <em class="term">FOR&hellip;NEXT</em>, <em class="term">WHILE&hellip;ENDWHILE</em>, <em class="term">REPEAT&hellip;UNTIL</em>, <em class="term">PROCEDURE&hellip;ENDPROCEDURE</em>, <em class="term">FUNCTION&hellip;ENDFUNCTION</em>.`},

    {t:"h",text:"Rule 3 - keywords in capitals, your names in CamelCase"},
    {t:"p",html:`Keywords are upper case. Names you invent start with a capital and run words together: <em class="term">StudentName</em>, <em class="term">TotalScore</em>. The name should describe the thing. <em class="term">x</em> is fine for a loop counter and nowhere else.`},

    {t:"h",text:"Rule 4 - comment the reason, not the obvious"},
    {t:"code",src:
`Count <- Count + 1     // BAD: "add one to Count" - we can see that

// Ignore the heading line before totalling   <- GOOD: explains why
READFILE "Data.txt", Line`},

    {t:"h",text:"Rule 5 - declare before you use"},
    {t:"p",html:`State every variable and its type before the algorithm body. It is never wrong and it is often a mark on its own.`},

    {t:"note",kind:"exam",label:"Examiner note",html:`<p>Paper 2 asks you to write, complete or correct algorithms. When it says <strong>&ldquo;write an algorithm using pseudocode&rdquo;</strong>, this notation is what it wants. A flowchart or a paragraph of English will not score the same marks.</p>`},

    {t:"check",
      q:`Rewrite this so it would earn full marks. There are four separate faults.`,
      code:`if total = 0 then
output "empty"
total = total + 1
end if`,
      marks:4,
      a:`<p>Lower-case keywords; <em class="term">=</em> used for assignment on line 3; no indentation; <em class="term">end if</em> instead of <em class="term">ENDIF</em>.</p>`,
      acode:`IF Total = 0 THEN
    OUTPUT "Empty"
    Total <- Total + 1
ENDIF`,
      run:{ setup:"DECLARE Total : INTEGER\nTotal <- 0" }}
  ]
},

{
  id:"G2", levels:["igcse"], title:"Variables, constants and data types",
  blurb:"The five types you will be asked for, and how to set them up.",
  blocks:[
    {t:"p",html:`A variable is a named box holding one value of one type. You create it with <em class="term">DECLARE</em>, giving a name and a type separated by a colon.`},
    {t:"code",src:
`DECLARE StudentName : STRING
DECLARE Age         : INTEGER
DECLARE Average     : REAL
DECLARE Grade       : CHAR
DECLARE HasPaid     : BOOLEAN`},

    {t:"h",text:"The five data types"},
    {t:"list",items:[
      `<strong>INTEGER</strong> &mdash; a whole number. <em class="term">7</em>, <em class="term">-3</em>, <em class="term">0</em>.`,
      `<strong>REAL</strong> &mdash; a number with a fractional part. <em class="term">3.75</em>. Note <em class="term">7.0</em> is REAL, not INTEGER.`,
      `<strong>CHAR</strong> &mdash; exactly one character, in <strong>single</strong> quotes: <em class="term">'A'</em>.`,
      `<strong>STRING</strong> &mdash; any number of characters, in <strong>double</strong> quotes: <em class="term">"Hello"</em>.`,
      `<strong>BOOLEAN</strong> &mdash; only <em class="term">TRUE</em> or <em class="term">FALSE</em>, written without quotes.`
    ]},
    {t:"note",kind:"warn",label:"Quote marks matter",html:`<p><em class="term">'A'</em> is a CHAR. <em class="term">"A"</em> is a STRING of length 1. Single quotes for one character, double quotes for text.</p>`},

    {t:"h",text:"Constants"},
    {t:"p",html:`A value that never changes while the program runs is a constant. Use one for any fixed number the question mentions &mdash; it reads better, and if the question later changes the value you change one line.`},
    {t:"code",src:
`CONSTANT MaxPlayers <- 4
CONSTANT SchoolName <- "Northgate High"

OUTPUT "Up to ", MaxPlayers, " players"`},
    {t:"note",kind:"tip",label:"A note on the arrow",html:`<p>IGCSE material usually writes a constant with the arrow, as above. Some sources use <em class="term">=</em> instead, which is what A Level uses. This app accepts both, so you can never be blocked by it &mdash; but write it the way your teacher and your textbook do.</p>`},

    {t:"h",text:"Initialising"},
    {t:"p",html:`Before you read a variable you must have put something in it. Totals and counters start at <em class="term">0</em>; a string you are building up starts at <em class="term">""</em>.`},
    {t:"code",src:
`DECLARE Total : INTEGER
DECLARE Name  : STRING

Total <- 0
Name  <- ""`},
    {t:"note",kind:"exam",label:"Examiner note",html:`<p>Forgetting to set a total or counter to zero is a routine one-mark loss, and it is the error this app will flag at you most often. If your algorithm accumulates anything, set its starting value before the loop.</p>`},

    {t:"check",
      q:`A shop charges a fixed delivery fee of 4.50 on every order. Set up what you need, start an order total at zero, and add the delivery fee to it.`,
      marks:3,
      a:`<p>One mark for the constant, one for a correctly typed declaration, one for initialising to zero before adding to it.</p>`,
      acode:`CONSTANT DeliveryFee <- 4.50
DECLARE OrderTotal : REAL

OrderTotal <- 0
OrderTotal <- OrderTotal + DeliveryFee

OUTPUT OrderTotal`}
  ]
},

{
  id:"G3", levels:["igcse"], title:"Input, output and operators",
  blurb:"Getting data in and results out, and the arithmetic that trips people up.",
  blocks:[
    {t:"p",html:`<em class="term">INPUT</em> takes a value from the user into a variable. <em class="term">OUTPUT</em> displays one or more values, separated by commas.`},
    {t:"code",src:
`DECLARE Name  : STRING
DECLARE Score : INTEGER

OUTPUT "Enter your name: "
INPUT Name
INPUT Score

OUTPUT "Hello ", Name, " you scored ", Score`},
    {t:"note",kind:"warn",label:"A frequent slip",html:`<p><em class="term">INPUT "Enter name", Name</em> is <strong>not</strong> the syntax. INPUT takes a variable and nothing else. Put the prompt on its own OUTPUT line above it.</p>`},

    {t:"h",text:"Arithmetic"},
    {t:"code",src:
`A + B          // add
A - B          // subtract
A * B          // multiply
A / B          // divide - always gives a REAL result`},

    {t:"h",text:"DIV and MOD"},
    {t:"p",html:`<em class="term">DIV</em> gives the whole-number part of a division; <em class="term">MOD</em> gives the remainder. They appear constantly: converting units, testing for even numbers, pulling digits apart.`},
    {t:"code",src:
`OUTPUT DIV(19, 7)      // 2  - how many whole 7s fit into 19
OUTPUT MOD(19, 7)      // 5  - what is left over

// Is a number even?
DECLARE N : INTEGER
N <- 8
IF MOD(N, 2) = 0 THEN
    OUTPUT "Even"
ENDIF`},

    {t:"h",text:"Comparison and logic"},
    {t:"code",src:
`=    equal to            <>   not equal to
<    less than           <=   less than or equal to
>    greater than        >=   greater than or equal to

AND  both must be true
OR   at least one must be true
NOT  reverses a condition`},
    {t:"note",kind:"exam",label:"Examiner note",html:`<p>&ldquo;Not equal to&rdquo; is <em class="term">&lt;&gt;</em>. Never <em class="term">!=</em> and never <em class="term">/=</em> &mdash; those belong to other languages and are not credited in pseudocode.</p>`},
    {t:"p",html:`A BOOLEAN variable is already a condition: write <em class="term">IF HasPaid THEN</em>, not <em class="term">IF HasPaid = TRUE THEN</em>.`},

    {t:"h",text:"Joining text"},
    {t:"p",html:`<em class="term">&amp;</em> joins strings into one value. Use commas in OUTPUT when you just want things printed next to each other.`},
    {t:"code",src:
`DECLARE First, Last, Full : STRING
First <- "Ada"
Last  <- "Lovelace"
Full  <- First & " " & Last
OUTPUT Full`},

    {t:"check",
      q:`A number of minutes is input. Output it as whole hours and remaining minutes, in the form "2 hours 35 minutes".`,
      marks:4,
      a:`<p>Marks for: declaring and inputting; DIV for the hours; MOD for the minutes; a correctly formed output.</p>`,
      acode:`DECLARE TotalMins, Hours, Mins : INTEGER

OUTPUT "Enter minutes: "
INPUT TotalMins

Hours <- DIV(TotalMins, 60)
Mins  <- MOD(TotalMins, 60)

OUTPUT Hours, " hours ", Mins, " minutes"`,
      run:{ inputs:"155" }}
  ]
},

{
  id:"G4", levels:["igcse"], title:"Selection: IF and CASE",
  blurb:"Choosing a path, and the boundary errors that quietly cost marks.",
  blocks:[
    {t:"h",text:"IF, ELSE, ENDIF"},
    {t:"code",src:
`IF <condition> THEN
    <statements>
ENDIF

IF <condition> THEN
    <statements>
ELSE
    <statements>
ENDIF`},
    {t:"p",html:`<em class="term">THEN</em> sits on the same line as <em class="term">IF</em>. <em class="term">ELSE</em> is optional; <em class="term">ENDIF</em> is not.`},

    {t:"h",text:"Nested IF for bands"},
    {t:"p",html:`When testing bands of a number, nest the IFs and work from one end. Order them properly and each test needs only one comparison.`},
    {t:"code",src:
`DECLARE Mark : INTEGER
DECLARE Grade : CHAR
Mark <- 74

IF Mark >= 80 THEN
    Grade <- 'A'
ELSE
    IF Mark >= 70 THEN          // we already know Mark < 80 here
        Grade <- 'B'
    ELSE
        IF Mark >= 60 THEN
            Grade <- 'C'
        ELSE
            Grade <- 'F'
        ENDIF
    ENDIF
ENDIF

OUTPUT Grade`},
    {t:"note",kind:"warn",label:"Boundary errors",html:`<p>Read the wording exactly. &ldquo;80 or more&rdquo; is <em class="term">&gt;= 80</em>. &ldquo;More than 80&rdquo; is <em class="term">&gt; 80</em>. A one-character slip loses the whole mark for that branch.</p>`},

    {t:"h",text:"CASE OF"},
    {t:"p",html:`When you compare <strong>one variable</strong> against a list of <strong>specific values</strong>, <em class="term">CASE OF</em> is shorter and clearer than a stack of IFs.`},
    {t:"code",src:
`DECLARE Choice : INTEGER
Choice <- 2

CASE OF Choice
    1        : OUTPUT "Add a record"
    2        : OUTPUT "Delete a record"
    3        : OUTPUT "Search"
    OTHERWISE: OUTPUT "Invalid choice, enter 1 to 3"
ENDCASE`},
    {t:"p",html:`A branch can cover a range:`},
    {t:"code",src:
`DECLARE Mark : INTEGER
Mark <- 64

CASE OF Mark
    80 TO 100 : OUTPUT "A"
    70 TO 79  : OUTPUT "B"
    60 TO 69  : OUTPUT "C"
    OTHERWISE : OUTPUT "F"
ENDCASE`},
    {t:"note",kind:"exam",label:"Examiner note",html:`<p>If a question gives you a numbered menu, it is asking for CASE OF. Include <em class="term">OTHERWISE</em> &mdash; it is almost always a mark on its own, and without it nothing happens at all on bad input.</p>`},

    {t:"check",
      q:`A vending machine takes a coin value in cents: 10, 20, 50 or 100. Output the name of the coin, or a suitable message for anything else.`,
      marks:4,
      a:`<p>Marks for: correct CASE OF header and ENDCASE; three or more correct value branches; the OTHERWISE branch; the colons separating each value from its statement.</p>`,
      acode:`DECLARE Coin : INTEGER

OUTPUT "Insert coin: "
INPUT Coin

CASE OF Coin
    10       : OUTPUT "Ten cents"
    20       : OUTPUT "Twenty cents"
    50       : OUTPUT "Fifty cents"
    100      : OUTPUT "One dollar"
    OTHERWISE: OUTPUT "Coin not accepted"
ENDCASE`,
      run:{ inputs:"50" }}
  ]
},

{
  id:"G5", levels:["igcse"], title:"Iteration: the three loops",
  blurb:"Choosing the right loop is itself a mark, and choosing wrongly usually breaks the algorithm.",
  blocks:[
    {t:"p",html:`The question to ask: <strong>do you know in advance how many times it repeats?</strong> If yes, <em class="term">FOR</em>. If no, you need a condition-controlled loop &mdash; then ask whether the body must run at least once.`},

    {t:"h",text:"FOR - a known number of repetitions"},
    {t:"code",src:
`FOR Counter <- 1 TO 10
    OUTPUT Counter
NEXT Counter

FOR i <- 10 TO 1 STEP -1        // counting down
    OUTPUT i
NEXT i

FOR i <- 0 TO 20 STEP 5         // 0, 5, 10, 15, 20
    OUTPUT i
NEXT i`},
    {t:"p",html:`The counter is set with an arrow, and <em class="term">NEXT</em> must name the same counter. Both halves are marked.`},

    {t:"h",text:"WHILE - tested first, may run zero times"},
    {t:"code",src:
`WHILE <condition> DO
    <statements>
ENDWHILE`},
    {t:"p",html:`The condition is checked <strong>before</strong> the first pass. If it is false immediately the body never runs &mdash; which is what you want when the body would be wrong on empty data.`},
    {t:"code",src:
`DECLARE Total, Count, Number : INTEGER
Total <- 0
Count <- 0

WHILE Count < 3 DO
    INPUT Number
    Total <- Total + Number
    Count <- Count + 1
ENDWHILE

OUTPUT Total`},

    {t:"h",text:"REPEAT - tested last, always runs at least once"},
    {t:"code",src:
`REPEAT
    <statements>
UNTIL <condition>`},
    {t:"p",html:`Checked <strong>after</strong> each pass, and it stops when the condition becomes <strong>true</strong>. That is the opposite sense to WHILE: WHILE carries on <em>while</em> true, REPEAT carries on <em>until</em> true.`},
    {t:"code",src:
`DECLARE Mark : INTEGER

REPEAT
    OUTPUT "Enter a mark between 0 and 100: "
    INPUT Mark
UNTIL Mark >= 0 AND Mark <= 100

OUTPUT "Accepted"`},
    {t:"note",kind:"exam",label:"Examiner note",html:`<p><strong>Validation is nearly always REPEAT&hellip;UNTIL</strong>, because you must ask once before you can know whether the answer is valid.</p>`},

    {t:"h",text:"The infinite loop"},
    {t:"p",html:`Every condition-controlled loop needs something inside the body that can change the condition. If your loop tests <em class="term">Count</em> but never changes it, it runs forever. This app will stop it and tell you so &mdash; in the exam, nobody will.`},

    {t:"check",
      q:`Input numbers repeatedly, adding them to a total, stopping when the user enters 0. Do not include the 0 in the total. Output the total.`,
      marks:5,
      a:`<p>Read the first value <em>before</em> the loop, then read the next one at the bottom of the body &mdash; so INPUT appears twice. Marks for: initialising the total; the first input; a correct loop condition; adding then re-inputting inside the loop; outputting after the loop.</p>`,
      acode:`DECLARE Number, Total : INTEGER

Total <- 0

OUTPUT "Enter a number (0 to finish): "
INPUT Number

WHILE Number <> 0 DO
    Total <- Total + Number
    OUTPUT "Enter a number (0 to finish): "
    INPUT Number
ENDWHILE

OUTPUT "Total is ", Total`,
      run:{ inputs:"5\n7\n0" }}
  ]
},

{
  id:"G6", levels:["igcse"], title:"Arrays",
  blurb:"One and two dimensions, traversal, totalling, and finding the largest.",
  blocks:[
    {t:"p",html:`An array holds many values of the <strong>same type</strong> under one name, reached by index. Declare it with its lower and upper bounds separated by a colon.`},
    {t:"code",src:
`DECLARE Scores : ARRAY[1:10] OF INTEGER
DECLARE Names  : ARRAY[1:10] OF STRING

Scores[1]  <- 75
Scores[10] <- 62

OUTPUT Scores[1]`},
    {t:"note",kind:"warn",label:"Bounds",html:`<p><em class="term">ARRAY[1:10]</em> has ten elements numbered 1 to 10. Use whatever bounds the question gives you, and never index outside them &mdash; going one past the end is the classic error.</p>`},

    {t:"h",text:"Traversing an array"},
    {t:"p",html:`A <em class="term">FOR</em> loop over the index visits every element. Almost every array question is a variation on this shape.`},
    {t:"code",src:
`DECLARE Scores : ARRAY[1:10] OF INTEGER
DECLARE i, Total : INTEGER
DECLARE Average : REAL

FOR i <- 1 TO 10
    Scores[i] <- i * 5
NEXT i

Total <- 0
FOR i <- 1 TO 10
    Total <- Total + Scores[i]
NEXT i

Average <- Total / 10
OUTPUT "Average is ", Average`},

    {t:"h",text:"Finding the largest, and where it is"},
    {t:"p",html:`Assume the first element is the best, then compare the rest against it. Do <strong>not</strong> start from 0 &mdash; if every value were negative, 0 would win and be wrong.`},
    {t:"code",src:
`DECLARE Scores : ARRAY[1:5] OF INTEGER
DECLARE i, Highest, Position : INTEGER

Scores[1] <- 12
Scores[2] <- 45
Scores[3] <- 7
Scores[4] <- 45
Scores[5] <- 31

Highest  <- Scores[1]
Position <- 1

FOR i <- 2 TO 5
    IF Scores[i] > Highest THEN
        Highest  <- Scores[i]
        Position <- i
    ENDIF
NEXT i

OUTPUT "Highest ", Highest, " at position ", Position`},
    {t:"p",html:`Using <em class="term">&gt;</em> rather than <em class="term">&gt;=</em> keeps the <strong>first</strong> occurrence when a value ties. Read the question to see which it wants.`},

    {t:"h",text:"Two-dimensional arrays"},
    {t:"p",html:`A 2D array is a grid. Declare both ranges and index with both, row first.`},
    {t:"code",src:
`DECLARE Seats : ARRAY[1:3, 1:4] OF BOOLEAN
DECLARE Row, Col : INTEGER

FOR Row <- 1 TO 3
    FOR Col <- 1 TO 4
        Seats[Row, Col] <- FALSE
    NEXT Col
NEXT Row

Seats[2, 3] <- TRUE
OUTPUT Seats[2, 3]`},
    {t:"note",kind:"exam",label:"Examiner note",html:`<p>In a nested loop the inner loop closes first: <em class="term">NEXT Col</em> then <em class="term">NEXT Row</em>. Crossing them over is a guaranteed lost mark and is easy to do under pressure.</p>`},

    {t:"check",
      q:`An array Temps holds 24 REAL values, one per hour. Count how many hours were above 30.0 degrees and output the count.`,
      marks:4,
      a:`<p>Marks for: initialising the counter to zero; a FOR loop with correct bounds and NEXT; a correct condition on the array element; outputting after the loop, not inside it.</p>`,
      acode:`DECLARE Temps : ARRAY[1:24] OF REAL
DECLARE i, Count : INTEGER

FOR i <- 1 TO 24
    Temps[i] <- i + 12.5
NEXT i

Count <- 0

FOR i <- 1 TO 24
    IF Temps[i] > 30.0 THEN
        Count <- Count + 1
    ENDIF
NEXT i

OUTPUT Count, " hours were above 30 degrees"`}
  ]
},

{
  id:"G7", levels:["igcse"], title:"String handling",
  blurb:"LENGTH, SUBSTRING, UCASE and LCASE - the four you are expected to use by name.",
  blocks:[
    {t:"p",html:`IGCSE gives you a small library. Learn the exact names and the order of the arguments &mdash; that is what gets credited.`},
    {t:"code",src:
`OUTPUT LENGTH("Computer")                 // 8
OUTPUT SUBSTRING("Computer", 4, 3)        // "put"
OUTPUT UCASE("Computer")                  // "COMPUTER"
OUTPUT LCASE("Computer")                  // "computer"`},
    {t:"note",kind:"warn",label:"SUBSTRING takes three arguments",html:`<p><em class="term">SUBSTRING(ThisString, Start, Length)</em> &mdash; the third argument is <strong>how many characters to take</strong>, not the finishing position. Characters are counted from 1.</p>`},

    {t:"h",text:"Walking through a string"},
    {t:"p",html:`The standard pattern: loop from 1 to the length, pulling out one character at a time. This is how you count vowels, reverse a string, or check a format.`},
    {t:"code",src:
`DECLARE Text, Upper : STRING
DECLARE Ch : CHAR
DECLARE i, Count : INTEGER

Text  <- "Engineering"
Upper <- UCASE(Text)        // fold the case ONCE, outside the loop
Count <- 0

FOR i <- 1 TO LENGTH(Upper)
    Ch <- SUBSTRING(Upper, i, 1)
    IF Ch = 'A' OR Ch = 'E' OR Ch = 'I' OR Ch = 'O' OR Ch = 'U' THEN
        Count <- Count + 1
    ENDIF
NEXT i

OUTPUT Count, " vowels"`},
    {t:"p",html:`Folding the case first means testing five letters instead of ten. Small efficiencies like this are exactly what an &ldquo;efficient algorithm&rdquo; mark looks for.`},

    {t:"h",text:"Building a string up"},
    {t:"p",html:`Start from an empty string and join onto it with <em class="term">&amp;</em>.`},
    {t:"code",src:
`DECLARE Text, Result : STRING
DECLARE i : INTEGER

Text   <- "stressed"
Result <- ""

FOR i <- LENGTH(Text) TO 1 STEP -1
    Result <- Result & SUBSTRING(Text, i, 1)
NEXT i

OUTPUT Result`},

    {t:"check",
      q:`A password is held in a STRING. Output "Long enough" if it is 8 characters or more, and "Too short" otherwise. Then output it in capitals.`,
      marks:4,
      a:`<p>Marks for: using LENGTH in the condition; the correct boundary (8 or more is <em class="term">&gt;=</em>); both branches present; UCASE used for the capitals.</p>`,
      acode:`DECLARE Password : STRING

Password <- "opensesame"

IF LENGTH(Password) >= 8 THEN
    OUTPUT "Long enough"
ELSE
    OUTPUT "Too short"
ENDIF

OUTPUT UCASE(Password)`}
  ]
},

{
  id:"G8", levels:["igcse"], title:"Procedures and functions",
  blurb:"Splitting a program into named parts, and the one question that decides which to use.",
  blocks:[
    {t:"p",html:`A <strong>procedure</strong> does something. A <strong>function</strong> calculates and gives a value back. That single sentence decides which one a question wants: if the result has to be used in a calculation or an assignment, it must be a function.`},

    {t:"h",text:"Procedures"},
    {t:"code",src:
`PROCEDURE ShowHeader()
    OUTPUT "========================"
    OUTPUT "   Student Report"
    OUTPUT "========================"
ENDPROCEDURE

CALL ShowHeader()`},
    {t:"p",html:`A procedure is always invoked with <em class="term">CALL</em>, and the brackets stay even when there are no parameters.`},

    {t:"h",text:"Parameters"},
    {t:"code",src:
`PROCEDURE PrintLine(Text : STRING, Times : INTEGER)
    DECLARE i : INTEGER
    FOR i <- 1 TO Times
        OUTPUT Text
    NEXT i
ENDPROCEDURE

CALL PrintLine("Hello", 3)`},
    {t:"p",html:`Each parameter is written <em class="term">Name : TYPE</em>, exactly like a declaration, separated by commas.`},

    {t:"h",text:"Functions"},
    {t:"code",src:
`FUNCTION AreaOfRectangle(W : REAL, H : REAL) RETURNS REAL
    RETURN W * H
ENDFUNCTION

DECLARE Area : REAL
Area <- AreaOfRectangle(4.0, 2.5)
OUTPUT Area
OUTPUT AreaOfRectangle(3.0, 3.0)`},
    {t:"note",kind:"exam",label:"Examiner note",html:`<p>Three marks live on a function header and all three are easy: the keyword <em class="term">FUNCTION</em>, the parameter list with types, and <em class="term">RETURNS</em> with the return type. Write the header and <em class="term">ENDFUNCTION</em> first, then fill in the logic &mdash; that way you cannot forget them.</p>`},

    {t:"h",text:"Why bother"},
    {t:"list",items:[
      `The same code is written once and used many times, so the program is shorter.`,
      `Each part can be tested on its own.`,
      `A long problem becomes several small ones, which is easier to get right.`,
      `A change only has to be made in one place.`
    ]},
    {t:"p",html:`Those are the marks for &ldquo;state two advantages of using sub-routines&rdquo;, which comes up often.`},

    {t:"check",
      q:`Write a function that takes two INTEGER values and returns the larger of them. Then use it.`,
      marks:5,
      a:`<p>Marks for: FUNCTION keyword with two typed parameters; RETURNS INTEGER on the header; ENDFUNCTION; the comparison; RETURN used on both paths.</p>`,
      acode:`FUNCTION Larger(A : INTEGER, B : INTEGER) RETURNS INTEGER
    IF A > B THEN
        RETURN A
    ELSE
        RETURN B
    ENDIF
ENDFUNCTION

OUTPUT Larger(3, 9)`}
  ]
},

{
  id:"G9", levels:["igcse"], title:"Validation, verification and trace tables",
  blurb:"Checking data is sensible, checking it was typed correctly, and reading somebody else's algorithm.",
  blocks:[
    {t:"h",text:"Validation - is the data sensible?"},
    {t:"p",html:`A validation check is made by the program on data as it is entered. Learn the names; questions ask for them by name.`},
    {t:"list",items:[
      `<strong>Range check</strong> &mdash; is it between two values? A month must be 1 to 12.`,
      `<strong>Length check</strong> &mdash; is it the right number of characters? A password of at least 8.`,
      `<strong>Type check</strong> &mdash; is it the right kind of data? An age must be a number.`,
      `<strong>Presence check</strong> &mdash; has anything been entered at all?`,
      `<strong>Format check</strong> &mdash; is it laid out correctly? A date as dd/mm/yyyy.`,
      `<strong>Check digit</strong> &mdash; an extra digit calculated from the others, used on barcodes and ISBNs.`
    ]},
    {t:"code",src:
`DECLARE Month : INTEGER

REPEAT
    OUTPUT "Enter the month number: "
    INPUT Month
    IF Month < 1 OR Month > 12 THEN
        OUTPUT "Months run from 1 to 12."
    ENDIF
UNTIL Month >= 1 AND Month <= 12

OUTPUT "Accepted"`},

    {t:"h",text:"Verification - was it typed correctly?"},
    {t:"p",html:`Verification checks that data was not changed as it was entered or copied. Two methods: <strong>double entry</strong> (type it twice and compare, as with a new password) and <strong>a visual check</strong> (read it back against the original). Validation and verification are different things and questions test the difference.`},

    {t:"h",text:"Trace tables"},
    {t:"p",html:`A trace table shows the value of every variable after each step, plus anything output. Marked strictly on the values, so method matters more than speed.`},
    {t:"list",items:[
      `Draw a column for every variable, and one final column headed OUTPUT.`,
      `One row per pass through the loop &mdash; not per line of code.`,
      `<strong>Only write a value when it changes.</strong> A blank means unchanged, which is what the mark scheme expects.`,
      `Evaluate the loop condition out loud before starting each row.`,
      `Never skip ahead because you can see the pattern. The pattern is usually the trap.`
    ]},
    {t:"code",src:
`DECLARE A, B : INTEGER
A <- 10
B <- 3

WHILE A > 0 DO
    A <- A - B
    B <- B + 1
    OUTPUT A
ENDWHILE`},
    {t:"p",html:`Start <strong>A = 10, B = 3</strong>. Pass 1: A becomes 7, B becomes 4, output 7. Pass 2: A becomes 3, B becomes 5, output 3. Pass 3: A becomes &minus;2, B becomes 6, output &minus;2. Pass 4: &minus;2 &gt; 0 is false, so it stops.`},
    {t:"p",html:`The last value output is negative, because the condition is only tested at the <em>top</em> of the loop &mdash; the body finishes even though A has gone past zero. That is exactly what the question is testing.`},
    {t:"note",kind:"exam",label:"Examiner note",html:`<p>Two classic traps: a <em class="term">REPEAT</em> loop always runs at least once even when the condition is already true, and a <em class="term">FOR</em> loop leaves its counter one past the end when it finishes.</p>`},

    {t:"check",
      q:`What is output by this algorithm, and how many times does the loop body run?`,
      code:`X <- 1
Y <- 0

REPEAT
    Y <- Y + X
    X <- X + 2
UNTIL X > 7

OUTPUT Y
OUTPUT X`,
      marks:3,
      a:`<p>Pass 1: Y = 1, X = 3 &mdash; 3 &gt; 7 false. Pass 2: Y = 4, X = 5 &mdash; false. Pass 3: Y = 9, X = 7 &mdash; 7 &gt; 7 is <em>false</em>, note. Pass 4: Y = 16, X = 9 &mdash; true, stop.</p><p><strong>Output: 16 then 9. The body runs 4 times.</strong> The trap is stopping at X = 7.</p>`}
  ]
},

{
  id:"G10", levels:["igcse"], title:"Files, and turning a question into an algorithm",
  blurb:"Storing data between runs, and the method to use when you do not know where to start.",
  blocks:[
    {t:"h",text:"Files"},
    {t:"p",html:`A file lets data survive after the program ends. Every file operation follows the same shape: <strong>open, use, close</strong>. Forgetting to close is a standard lost mark.`},
    {t:"code",src:
`OPENFILE "Students.txt" FOR WRITE
WRITEFILE "Students.txt", "Amara Okafor"
WRITEFILE "Students.txt", "Ravi Deshmukh"
CLOSEFILE "Students.txt"

DECLARE Line : STRING
OPENFILE "Students.txt" FOR READ
READFILE "Students.txt", Line
CLOSEFILE "Students.txt"

OUTPUT Line`},
    {t:"note",kind:"warn",label:"FOR WRITE destroys what is there",html:`<p>Opening an existing file <em class="term">FOR WRITE</em> wipes it first. At IGCSE you have READ and WRITE only, so if you must keep existing records you read them all in, then write them all back out.</p>`},

    {t:"h",text:"Reading to the end"},
    {t:"code",src:
`DECLARE Line : STRING
DECLARE Count : INTEGER

OPENFILE "Names.txt" FOR WRITE
WRITEFILE "Names.txt", "Amara"
WRITEFILE "Names.txt", "Ravi"
WRITEFILE "Names.txt", "Sofia"
CLOSEFILE "Names.txt"

Count <- 0
OPENFILE "Names.txt" FOR READ

WHILE NOT EOF("Names.txt") DO
    READFILE "Names.txt", Line
    OUTPUT Line
    Count <- Count + 1
ENDWHILE

CLOSEFILE "Names.txt"
OUTPUT Count, " records"`},
    {t:"p",html:`It must be <em class="term">WHILE</em>, not <em class="term">REPEAT</em> &mdash; an empty file has to read nothing. And it is <em class="term">NOT EOF(...)</em>: carry on <em>while it is not the end</em>.`},

    {t:"h",text:"Turning a question into an algorithm"},
    {t:"p",html:`Most marks are lost on long questions not because you cannot code, but because you start writing before you know what you are writing.`},
    {t:"list",items:[
      `<strong>Underline the verbs.</strong> Every instruction verb is a step and usually a mark: <em>input</em>, <em>validate</em>, <em>count</em>, <em>total</em>, <em>compare</em>, <em>output</em>. Six verbs is roughly a six-mark answer.`,
      `<strong>Write the declarations first.</strong> What comes in, what is accumulated, what goes out. This reveals what you have missed &mdash; if you need an average and have no counter, you now know.`,
      `<strong>Choose the loop, then fill it.</strong> Write the opening and closing lines immediately, then write the body inside them. Then you cannot forget NEXT or ENDWHILE.`,
      `<strong>Handle the edge, then output.</strong> What if there are zero items? What if nothing matched? A single IF guarding a division is often a whole mark.`
    ]},
    {t:"note",kind:"exam",label:"Timing",html:`<p>Marks are spread evenly, so never spend fifteen minutes perfecting a five-mark question while a later one sits blank. If you are stuck, write the declarations, the loop skeleton and the output lines, leave the hard middle and come back. A skeleton with the right structure reliably scores; a blank page never does.</p>`},

    {t:"check",
      q:`Twenty marks are entered. Each must be 0 to 100. Output the average and how many were 50 or more.`,
      marks:6,
      a:`<p>Verbs: <em>entered</em> (20 times, known count so FOR), <em>must be</em> (validation, so REPEAT inside), <em>average</em> (needs a total), <em>how many</em> (needs a counter), <em>output</em> (after the loop). Marks for: both accumulators initialised; a FOR loop of the right length; validation that repeats; the total; the pass counter; both outputs after the loop.</p>`,
      acode:`CONSTANT ClassSize <- 20
CONSTANT PassMark  <- 50

DECLARE Mark, Total, Passes, i : INTEGER

Total  <- 0
Passes <- 0

FOR i <- 1 TO ClassSize
    REPEAT
        OUTPUT "Enter mark ", i, ": "
        INPUT Mark
        IF Mark < 0 OR Mark > 100 THEN
            OUTPUT "Marks run from 0 to 100."
        ENDIF
    UNTIL Mark >= 0 AND Mark <= 100

    Total <- Total + Mark
    IF Mark >= PassMark THEN
        Passes <- Passes + 1
    ENDIF
NEXT i

OUTPUT "Average: ", Total / ClassSize
OUTPUT Passes, " out of ", ClassSize, " passed"`,
      run:{ inputs:"55\n60\n45\n70\n80\n90\n35\n65\n50\n75\n40\n85\n95\n30\n55\n60\n70\n45\n80\n50" }}
  ]
}
];
