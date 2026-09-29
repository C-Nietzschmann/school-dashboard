/* ============================================================================
   COURSE CONTENT
   Block types: h | p | list | code | note | check
   ========================================================================== */
"use strict";

/* Same file serves the browser and tools/verify.mjs under Node. */
var __g = (typeof window !== "undefined") ? window : globalThis;

__g.LESSONS_ALEVEL = [
{
  id:"L1", levels:["as","a2"], title:"The rules that earn marks",
  blurb:"Five mechanical habits. Get these automatic and you stop losing marks you had already earned.",
  blocks:[
    {t:"p",html:`Pseudocode in 9618 is not a programming language &mdash; nothing runs it. It is a way of writing an algorithm so precisely that a competent programmer could turn it into working code without asking you a single question. That is the standard an examiner marks against.`},
    {t:"p",html:`Because nothing runs it, you get no error messages. The only feedback is the mark scheme, months later. So the habits below have to be built in advance.`},

    {t:"h",text:"Rule 1 — assignment is an arrow, never an equals sign"},
    {t:"p",html:`The single most common slip. <strong>&#8592;</strong> means <em>put this value into this variable</em>. <strong>=</strong> means <em>are these two things equal?</em> and belongs only inside a condition.`},
    {t:"code",src:
`Total  <- 0            // correct: put 0 into Total
Count  <- Count + 1    // correct: read Count, add 1, store it back

IF Total = 0 THEN      // correct: = is a comparison here
    OUTPUT "Empty"
ENDIF`},

    {t:"h",text:"Rule 2 — indent every block, and close it"},
    {t:"p",html:`Each opening keyword has a matching closing keyword and the statements between them are indented, normally by four spaces. Indentation is not decoration; it is how the examiner sees which statements are inside the loop.`},
    {t:"code",src:
`IF Mark >= 50 THEN
    OUTPUT "Pass"
ELSE
    OUTPUT "Fail"
ENDIF

FOR i <- 1 TO 10
    OUTPUT i
NEXT i`},
    {t:"p",html:`The pairs you must never leave open: <em class="term">IF&hellip;ENDIF</em>, <em class="term">CASE OF&hellip;ENDCASE</em>, <em class="term">FOR&hellip;NEXT</em>, <em class="term">WHILE&hellip;ENDWHILE</em>, <em class="term">REPEAT&hellip;UNTIL</em>, <em class="term">PROCEDURE&hellip;ENDPROCEDURE</em>, <em class="term">FUNCTION&hellip;ENDFUNCTION</em>, <em class="term">TYPE&hellip;ENDTYPE</em>, <em class="term">CLASS&hellip;ENDCLASS</em>.`},

    {t:"h",text:"Rule 3 — keywords in capitals, your own names in CamelCase"},
    {t:"p",html:`Syllabus keywords are written in upper case. Identifiers you invent start with a capital and run words together: <em class="term">StudentName</em>, <em class="term">TotalScore</em>, <em class="term">NumberOfItems</em>. Names should describe the thing. <em class="term">x</em> is acceptable for a loop counter and nowhere else.`},

    {t:"h",text:"Rule 4 — comment the intent, not the obvious"},
    {t:"p",html:`A comment starts with <em class="term">//</em>. Do not narrate what the line plainly says. Explain <em>why</em>, or label a section of the algorithm.`},
    {t:"code",src:
`Count <- Count + 1        // BAD: add one to Count. We can see that.

// Skip the header row before totalling   <- GOOD: explains the reason
READFILE DataFile, Line`},

    {t:"h",text:"Rule 5 — declare before you use"},
    {t:"p",html:`State every variable and its type before the algorithm body. Some questions do not demand it, but it is never wrong and it is often worth a mark on its own.`},

    {t:"note",kind:"exam",label:"Examiner note",html:`<p>When a question says <strong>&ldquo;Write pseudocode&rdquo;</strong> you must use this notation. When it says <strong>&ldquo;Write program code&rdquo;</strong> you may use Python, Java, VB.NET or C# instead &mdash; and then you must follow that language properly, including its own syntax. Read which one is being asked for. Answering the wrong one is an expensive mistake.</p>`},

    {t:"check",
      q:`Rewrite this so it would earn full marks. There are four separate faults.`,
      code:`if count = 0 then
output "none"
count = count + 1
end if`,
      marks:4,
      a:`<p>The four faults: lower-case keywords; <em class="term">=</em> used for assignment on line 3; no indentation; <em class="term">end if</em> instead of <em class="term">ENDIF</em>.</p>`,
      acode:`IF Count = 0 THEN
    OUTPUT "None"
    Count <- Count + 1
ENDIF`,
      run:{ setup:"DECLARE Count : INTEGER\nCount <- 0" }}
  ]
},

{
  id:"L2", levels:["as","a2"], title:"Variables, data types and assignment",
  blurb:"DECLARE, CONSTANT, and the five types you will actually be asked for.",
  blocks:[
    {t:"p",html:`A variable is a named box holding one value of one type. You create it with <em class="term">DECLARE</em>, giving a name and a type, separated by a colon.`},
    {t:"code",src:
`DECLARE StudentName : STRING
DECLARE Age         : INTEGER
DECLARE Average     : REAL
DECLARE Grade       : CHAR
DECLARE HasPaid     : BOOLEAN
DECLARE Enrolled    : DATE`},

    {t:"h",text:"The six data types"},
    {t:"list",items:[
      `<strong>INTEGER</strong> &mdash; a whole number, positive or negative. <em class="term">7</em>, <em class="term">-3</em>, <em class="term">0</em>.`,
      `<strong>REAL</strong> &mdash; a number with a fractional part. <em class="term">3.75</em>. Note that <em class="term">7.0</em> is REAL, not INTEGER.`,
      `<strong>CHAR</strong> &mdash; exactly one character, in <strong>single</strong> quotes: <em class="term">'A'</em>.`,
      `<strong>STRING</strong> &mdash; any number of characters, in <strong>double</strong> quotes: <em class="term">"Hello"</em>. An empty string is <em class="term">""</em>.`,
      `<strong>BOOLEAN</strong> &mdash; only <em class="term">TRUE</em> or <em class="term">FALSE</em>, written without quotes.`,
      `<strong>DATE</strong> &mdash; a calendar date, written <em class="term">dd/mm/yyyy</em>.`
    ]},

    {t:"note",kind:"warn",label:"Quote marks matter",html:`<p><em class="term">'A'</em> is a CHAR. <em class="term">"A"</em> is a STRING of length 1. They are different types and a mark scheme can distinguish them. Single quotes for one character, double quotes for text.</p>`},

    {t:"h",text:"Constants"},
    {t:"p",html:`A value that never changes while the algorithm runs is a constant. It is assigned with <em class="term">=</em> at the point of declaration &mdash; this is the one place <em class="term">=</em> is not a comparison &mdash; and it has no type written, because the type is obvious from the value.`},
    {t:"code",src:
`CONSTANT VAT          = 0.20
CONSTANT MaxPlayers   = 4
CONSTANT SchoolName   = "Northgate High"`},
    {t:"p",html:`Use constants for any fixed number the question mentions. It reads better, and if the question later says &ldquo;the rate changes to 0.25&rdquo; you change one line.`},

    {t:"h",text:"Assignment"},
    {t:"code",src:
`DECLARE Total : INTEGER
DECLARE Price : REAL

Total <- 0                  // initialise before use
Price <- 19.99
Total <- Total + 1          // right side is evaluated first, then stored`},

    {t:"note",kind:"exam",label:"Examiner note",html:`<p>Forgetting to initialise a total or counter to zero is a routine one-mark loss. If your algorithm accumulates anything &mdash; a running total, a count, a longest-so-far &mdash; set its starting value explicitly before the loop.</p>`},

    {t:"check",
      q:`A shop charges a fixed delivery fee of 4.50 on every order. Declare what you need, then set an order total to 0 and add the delivery fee to it.`,
      marks:3,
      a:`<p>One mark for the constant, one for a correctly typed declaration, one for initialising to zero before adding.</p>`,
      acode:`CONSTANT DeliveryFee = 4.50
DECLARE OrderTotal : REAL

OrderTotal <- 0
OrderTotal <- OrderTotal + DeliveryFee`}
  ]
},

{
  id:"L3", levels:["as","a2"], title:"Input, output and operators",
  blurb:"Getting data in, results out, and the arithmetic that trips people up: DIV, MOD and integer division.",
  blocks:[
    {t:"p",html:`<em class="term">INPUT</em> takes a value from the user and stores it in a variable. <em class="term">OUTPUT</em> displays one or more values, separated by commas.`},
    {t:"code",src:
`DECLARE Name  : STRING
DECLARE Score : INTEGER

OUTPUT "Enter your name: "
INPUT Name
INPUT Score

OUTPUT "Hello ", Name, " you scored ", Score`},
    {t:"note",kind:"warn",label:"A frequent slip",html:`<p><em class="term">INPUT "Enter name", Name</em> is <strong>not</strong> the syntax. <em class="term">INPUT</em> takes a variable and nothing else. If you want a prompt, <em class="term">OUTPUT</em> it on the line before.</p>`},

    {t:"h",text:"Arithmetic operators"},
    {t:"code",src:
`A + B          // add
A - B          // subtract
A * B          // multiply
A / B          // divide  -- always gives a REAL result
A ^ B          // A to the power of B`},

    {t:"h",text:"DIV and MOD"},
    {t:"p",html:`These two are written as <strong>functions</strong>, not as operators. <em class="term">DIV</em> gives the whole-number part of a division; <em class="term">MOD</em> gives the remainder. They appear in exams constantly: converting seconds to minutes, testing whether a number is even, extracting digits.`},
    {t:"code",src:
`DIV(19, 7)     // = 2   how many whole 7s fit into 19
MOD(19, 7)     // = 5   what is left over

// Is a number even?
IF MOD(Number, 2) = 0 THEN
    OUTPUT "Even"
ENDIF

// 200 seconds as minutes and seconds
Minutes <- DIV(200, 60)     // 3
Seconds <- MOD(200, 60)     // 20`},

    {t:"h",text:"Comparison and logic"},
    {t:"code",src:
`=    equal to            <>   not equal to
<    less than           <=   less than or equal to
>    greater than        >=   greater than or equal to

AND  both must be true
OR   at least one must be true
NOT  reverses a condition

IF Age >= 13 AND Age <= 19 THEN
    OUTPUT "Teenager"
ENDIF

IF NOT HasPaid THEN
    OUTPUT "Payment outstanding"
ENDIF`},
    {t:"note",kind:"exam",label:"Examiner note",html:`<p>&ldquo;Not equal to&rdquo; is <em class="term">&lt;&gt;</em>. It is never <em class="term">!=</em> and never <em class="term">/=</em> &mdash; those are programming-language operators and will not be credited in a pseudocode answer.</p>`},
    {t:"p",html:`Note also that a BOOLEAN variable is already a condition. Write <em class="term">IF HasPaid THEN</em>, not <em class="term">IF HasPaid = TRUE THEN</em>. The second is not wrong, but the first shows you understand what a BOOLEAN is.`},

    {t:"h",text:"Joining strings"},
    {t:"p",html:`<em class="term">&amp;</em> joins two strings into one. Use it when you need a single combined value; use commas in <em class="term">OUTPUT</em> when you just want things printed next to each other.`},
    {t:"code",src:
`FullName <- FirstName & " " & LastName`},

    {t:"check",
      q:`A number of minutes is input. Output it as whole hours and remaining minutes, in the form "2 hours 35 minutes".`,
      marks:4,
      a:`<p>Marks for: declaring and inputting; DIV for the hours; MOD for the minutes; a correctly formed output.</p>`,
      acode:`DECLARE TotalMins : INTEGER
DECLARE Hours     : INTEGER
DECLARE Mins      : INTEGER

OUTPUT "Enter minutes: "
INPUT TotalMins

Hours <- DIV(TotalMins, 60)
Mins  <- MOD(TotalMins, 60)

OUTPUT Hours, " hours ", Mins, " minutes"`,
      run:{ inputs:"155" }}
  ]
},

{
  id:"L4", levels:["as","a2"], title:"Selection: IF and CASE",
  blurb:"Choosing a path. When nested IFs are right, when CASE is right, and the boundary errors that cost marks.",
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
    {t:"p",html:`<em class="term">THEN</em> sits on the same line as <em class="term">IF</em>. <em class="term">ELSE</em> is optional. <em class="term">ENDIF</em> is not.`},

    {t:"h",text:"Nested IF for ranges"},
    {t:"p",html:`When you are testing bands of a number &mdash; grade boundaries, tax bands, postage bands &mdash; nest the IFs and go in order from one end. Once you order them correctly you do not need to test both ends of each band.`},
    {t:"code",src:
`IF Mark >= 80 THEN
    Grade <- "A"
ELSE
    IF Mark >= 70 THEN         // we already know Mark < 80 here
        Grade <- "B"
    ELSE
        IF Mark >= 60 THEN
            Grade <- "C"
        ELSE
            Grade <- "F"
        ENDIF
    ENDIF
ENDIF`},
    {t:"note",kind:"warn",label:"Boundary errors",html:`<p>Read the question&rsquo;s wording exactly. &ldquo;80 or more&rdquo; is <em class="term">&gt;= 80</em>. &ldquo;More than 80&rdquo; is <em class="term">&gt; 80</em>. &ldquo;Between 60 and 70&rdquo; is ambiguous in English and you should handle it as inclusive unless told otherwise &mdash; but say so in a comment. A one-character boundary slip usually costs the whole mark for that branch.</p>`},

    {t:"h",text:"CASE OF"},
    {t:"p",html:`When you are comparing <strong>one variable</strong> against a list of <strong>specific values</strong>, <em class="term">CASE OF</em> is shorter and clearer than a stack of IFs. It cannot test conditions &mdash; only values of the one variable named after <em class="term">CASE OF</em>.`},
    {t:"code",src:
`CASE OF Choice
    1        : CALL AddRecord()
    2        : CALL DeleteRecord()
    3        : CALL SearchRecords()
    4        : OUTPUT "Goodbye"
    OTHERWISE: OUTPUT "Invalid choice, enter 1 to 4"
ENDCASE`},
    {t:"p",html:`Ranges and lists are allowed on a single branch:`},
    {t:"code",src:
`CASE OF Mark
    80 TO 100 : Grade <- "A"
    70 TO 79  : Grade <- "B"
    60 TO 69  : Grade <- "C"
    OTHERWISE : Grade <- "F"
ENDCASE`},

    {t:"note",kind:"exam",label:"Examiner note",html:`<p>If a question gives you a numbered menu, it is asking for <em class="term">CASE OF</em>. Include <em class="term">OTHERWISE</em> &mdash; it is almost always a mark on its own, and leaving it out means the algorithm does nothing at all on bad input.</p>`},

    {t:"check",
      q:`A vending machine takes a coin value in cents: 10, 20, 50 or 100. Output the name of the coin, or a suitable message for anything else.`,
      marks:4,
      a:`<p>Marks for: correct CASE OF header and ENDCASE; three or more correct value branches; the OTHERWISE branch; valid overall syntax with the colons.</p>`,
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
  id:"L5", levels:["as","a2"], title:"Iteration: FOR, WHILE and REPEAT",
  blurb:"Three loops. Choosing the right one is itself a mark, and choosing wrongly usually breaks the algorithm.",
  blocks:[
    {t:"p",html:`The rule for choosing: <strong>do you know in advance how many times it repeats?</strong> If yes, use <em class="term">FOR</em>. If no, you need a condition-controlled loop &mdash; and then ask whether the body must run at least once.`},

    {t:"h",text:"FOR — a known number of repetitions"},
    {t:"code",src:
`FOR Counter <- 1 TO 10
    OUTPUT Counter
NEXT Counter

FOR i <- 10 TO 1 STEP -1      // counting down
    OUTPUT i
NEXT i

FOR i <- 0 TO 100 STEP 5      // 0, 5, 10 ... 100
    OUTPUT i
NEXT i`},
    {t:"p",html:`The counter is assigned with an arrow, and <em class="term">NEXT</em> must name the same counter variable. Both halves are marked.`},

    {t:"h",text:"WHILE — test first, may run zero times"},
    {t:"code",src:
`WHILE <condition> DO
    <statements>
ENDWHILE`},
    {t:"p",html:`The condition is checked <strong>before</strong> the first pass. If it is false immediately, the body never runs. This is what you want when the body would be wrong or unsafe on empty data.`},
    {t:"code",src:
`Total <- 0
Count <- 0

WHILE Count < 10 DO
    INPUT Number
    Total <- Total + Number
    Count <- Count + 1
ENDWHILE`},

    {t:"h",text:"REPEAT — test last, always runs at least once"},
    {t:"code",src:
`REPEAT
    <statements>
UNTIL <condition>`},
    {t:"p",html:`The condition is checked <strong>after</strong> each pass, and the loop stops when it becomes <strong>true</strong>. Note that this is the opposite sense to WHILE: WHILE continues while true, REPEAT continues until true.`},
    {t:"code",src:
`// Input validation: you must ask at least once
REPEAT
    OUTPUT "Enter a mark between 0 and 100: "
    INPUT Mark
UNTIL Mark >= 0 AND Mark <= 100`},

    {t:"note",kind:"exam",label:"Examiner note",html:`<p><strong>Validation is nearly always REPEAT&hellip;UNTIL</strong>, because you have to ask the first time before you can know whether the answer is valid. Writing it as a WHILE means you must input once before the loop and again inside it &mdash; correct, but longer and easier to get wrong.</p>`},

    {t:"h",text:"The infinite loop"},
    {t:"p",html:`Every condition-controlled loop needs something inside the body that can eventually change the condition. If your loop tests <em class="term">Count</em> but never changes <em class="term">Count</em>, it runs forever. Check this before you move on &mdash; it is the difference between an algorithm and a hang.`},

    {t:"check",
      q:`Input numbers repeatedly, adding them to a total, and stop when the user enters 0. Do not include the 0 in the total. Output the total.`,
      marks:5,
      a:`<p>A REPEAT works, but then you must exclude the terminating 0 from the total &mdash; which is fiddly. The cleaner answer inputs once before a WHILE. Marks for: initialising the total; the first input; a correct loop condition; adding then re-inputting inside the loop; outputting after the loop.</p>`,
      acode:`DECLARE Number : INTEGER
DECLARE Total  : INTEGER

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
  id:"L6", levels:["as","a2"], title:"Arrays",
  blurb:"One and two dimensions, declaring bounds, traversal, and the standard search and sort you are expected to know.",
  blocks:[
    {t:"p",html:`An array is a set of values of the <strong>same type</strong> under one name, reached by index. You declare it with its lower and upper bounds, separated by a colon.`},
    {t:"code",src:
`DECLARE Scores : ARRAY[1:30] OF INTEGER
DECLARE Names  : ARRAY[1:30] OF STRING

Scores[1]  <- 75
Scores[30] <- 62

OUTPUT Scores[1]`},
    {t:"note",kind:"warn",label:"Bounds",html:`<p><em class="term">ARRAY[1:30]</em> has thirty elements numbered 1 to 30 &mdash; the syllabus normally starts at 1, unlike most real languages. <em class="term">ARRAY[0:29]</em> also has thirty, numbered 0 to 29. Use whatever bounds the question gives you, and never index outside them.</p>`},

    {t:"h",text:"Traversing an array"},
    {t:"p",html:`A <em class="term">FOR</em> loop over the index is the standard way to visit every element. Nearly every array question is a variation on this shape.`},
    {t:"code",src:
`DECLARE Scores : ARRAY[1:30] OF INTEGER
DECLARE Total   : INTEGER
DECLARE Average : REAL

Total <- 0
FOR i <- 1 TO 30
    Total <- Total + Scores[i]
NEXT i

Average <- Total / 30
OUTPUT "Average is ", Average`},

    {t:"h",text:"Finding the largest, and where it is"},
    {t:"p",html:`Start by assuming the first element is the best, then compare the rest against it. Do <strong>not</strong> start from 0 &mdash; if every score is negative, 0 would win and be wrong.`},
    {t:"code",src:
`Highest   <- Scores[1]
Position  <- 1

FOR i <- 2 TO 30
    IF Scores[i] > Highest THEN
        Highest  <- Scores[i]
        Position <- i
    ENDIF
NEXT i

OUTPUT "Highest was ", Highest, " at position ", Position`},

    {t:"h",text:"Linear search"},
    {t:"code",src:
`FUNCTION FindName(Target : STRING) RETURNS INTEGER
    DECLARE i     : INTEGER
    DECLARE Found : BOOLEAN

    i     <- 1
    Found <- FALSE

    WHILE i <= 30 AND Found = FALSE DO
        IF Names[i] = Target THEN
            Found <- TRUE
        ELSE
            i <- i + 1
        ENDIF
    ENDWHILE

    IF Found THEN
        RETURN i          // the position it was found at
    ELSE
        RETURN -1         // a value that cannot be a valid position
    ENDIF
ENDFUNCTION`},
    {t:"p",html:`Notice the loop stops as soon as it finds a match &mdash; that is what the <em class="term">Found</em> flag is for. A search that keeps going after finding the answer still works, but wastes the mark for efficiency when the question asks for it.`},

    {t:"h",text:"Two-dimensional arrays"},
    {t:"p",html:`A 2D array is a grid: rows and columns. Declare both ranges, and index with both, row first.`},
    {t:"code",src:
`DECLARE Seats : ARRAY[1:10, 1:6] OF BOOLEAN     // 10 rows, 6 seats per row

Seats[3, 4] <- TRUE

// Visit every cell: outer loop rows, inner loop columns
FOR Row <- 1 TO 10
    FOR Col <- 1 TO 6
        IF Seats[Row, Col] = FALSE THEN
            OUTPUT "Free: row ", Row, " seat ", Col
        ENDIF
    NEXT Col
NEXT Row`},
    {t:"note",kind:"exam",label:"Examiner note",html:`<p>In a nested loop the inner loop must be closed before the outer one: <em class="term">NEXT Col</em> then <em class="term">NEXT Row</em>. Crossing them over is a guaranteed lost mark, and it is surprisingly easy to do under time pressure.</p>`},

    {t:"h",text:"Bubble sort"},
    {t:"p",html:`Worth learning by heart. Repeatedly walk the array swapping any neighbouring pair that is out of order; the largest value bubbles to the end each pass.`},
    {t:"code",src:
`DECLARE Temp : INTEGER

FOR Pass <- 1 TO 29
    FOR i <- 1 TO 30 - Pass
        IF Scores[i] > Scores[i + 1] THEN
            Temp           <- Scores[i]        // three lines to swap:
            Scores[i]      <- Scores[i + 1]    // you cannot do it in two
            Scores[i + 1]  <- Temp
        ENDIF
    NEXT i
NEXT Pass`},

    {t:"check",
      q:`An array Temps holds 24 REAL values, one per hour. Count how many hours were above 30.0 degrees and output the count.`,
      marks:4,
      a:`<p>Marks for: initialising the counter to zero; a FOR loop with correct bounds and NEXT; a correct condition on the array element; outputting after the loop, not inside it.</p>`,
      acode:`DECLARE Temps : ARRAY[1:24] OF REAL
DECLARE Count : INTEGER
DECLARE i     : INTEGER

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
  id:"L7", levels:["as","a2"], title:"Strings and built-in functions",
  blurb:"The library the syllabus expects you to use by name. Reaching for these instead of writing your own earns marks.",
  blocks:[
    {t:"p",html:`The syllabus defines a set of functions you may use without writing them. Learn the exact names and the order of the parameters &mdash; that is what gets credited.`},

    {t:"h",text:"The string functions"},
    {t:"code",src:
`LENGTH("Computer")           // 8    number of characters
LEFT("Computer", 4)          // "Comp"      first 4
RIGHT("Computer", 3)         // "ter"       last 3
MID("Computer", 4, 3)        // "put"       3 characters starting at position 4
TO_UPPER("Computer")         // "COMPUTER"
TO_LOWER("Computer")         // "computer"`},
    {t:"note",kind:"warn",label:"MID takes three arguments",html:`<p><em class="term">MID(ThisString, Start, Length)</em> &mdash; the third argument is <strong>how many characters to take</strong>, not the finishing position. Strings are counted from position 1.</p>`},

    {t:"h",text:"Conversion and character functions"},
    {t:"code",src:
`NUM_TO_STRING(3.75)     // "3.75"
STRING_TO_NUM("42")     // 42
IS_NUM("42")            // TRUE   -- can this string be converted?
ASC('A')                // 65     character to its code
CHR(66)                 // 'B'    code to its character
INT(7.9)                // 7      throw away the fractional part
RAND(10)                // a random REAL from 0 up to (but not including) 10`},

    {t:"h",text:"Walking through a string one character at a time"},
    {t:"p",html:`The standard pattern: loop from 1 to the length, pulling out one character with <em class="term">MID</em>. This is how you count vowels, reverse a string, check a palindrome, or validate a format.`},
    {t:"code",src:
`FUNCTION CountVowels(Text : STRING) RETURNS INTEGER
    DECLARE i     : INTEGER
    DECLARE Count : INTEGER
    DECLARE Ch    : CHAR

    Count <- 0

    FOR i <- 1 TO LENGTH(Text)
        Ch <- MID(TO_UPPER(Text), i, 1)          // fold case once, then test
        IF Ch = 'A' OR Ch = 'E' OR Ch = 'I' OR Ch = 'O' OR Ch = 'U' THEN
            Count <- Count + 1
        ENDIF
    NEXT i

    RETURN Count
ENDFUNCTION`},
    {t:"p",html:`Calling <em class="term">TO_UPPER</em> means you test five letters rather than ten. Small efficiencies like this are exactly what an &ldquo;efficient algorithm&rdquo; mark is looking for.`},

    {t:"h",text:"Building a string up"},
    {t:"code",src:
`FUNCTION Reverse(Text : STRING) RETURNS STRING
    DECLARE Result : STRING
    DECLARE i      : INTEGER

    Result <- ""                                  // start from empty

    FOR i <- LENGTH(Text) TO 1 STEP -1
        Result <- Result & MID(Text, i, 1)
    NEXT i

    RETURN Result
ENDFUNCTION`},

    {t:"check",
      q:`Write a function that takes a STRING and returns TRUE if it is at least 8 characters long and contains at least one digit. Assume a helper IS_NUM is available for single characters.`,
      marks:5,
      a:`<p>Marks for: correct FUNCTION header with a BOOLEAN return type; the length test; a loop across the characters; detecting a digit and setting a flag; returning the combined result.</p>`,
      acode:`FUNCTION StrongEnough(Password : STRING) RETURNS BOOLEAN
    DECLARE i        : INTEGER
    DECLARE HasDigit : BOOLEAN

    HasDigit <- FALSE

    FOR i <- 1 TO LENGTH(Password)
        IF IS_NUM(MID(Password, i, 1)) THEN
            HasDigit <- TRUE
        ENDIF
    NEXT i

    IF LENGTH(Password) >= 8 AND HasDigit THEN
        RETURN TRUE
    ELSE
        RETURN FALSE
    ENDIF
ENDFUNCTION`}
  ]
},

{
  id:"L8", levels:["as","a2"], title:"Procedures and functions",
  blurb:"Splitting an algorithm into named parts, passing data in, and the BYVAL / BYREF distinction examiners love.",
  blocks:[
    {t:"p",html:`A <strong>procedure</strong> does something. A <strong>function</strong> calculates and gives back a value. That single sentence decides which one a question wants: if the result has to be used in an expression or assignment, it must be a function.`},

    {t:"h",text:"Procedures"},
    {t:"code",src:
`PROCEDURE ShowHeader()
    OUTPUT "=========================="
    OUTPUT "   Student Report 2026"
    OUTPUT "=========================="
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
    {t:"p",html:`Each parameter is written as <em class="term">Name : TYPE</em>, exactly like a declaration, separated by commas.`},

    {t:"h",text:"Functions"},
    {t:"code",src:
`FUNCTION AreaOfCircle(Radius : REAL) RETURNS REAL
    CONSTANT Pi = 3.14159
    RETURN Pi * Radius ^ 2
ENDFUNCTION

Area <- AreaOfCircle(5.0)              // used in an assignment
OUTPUT AreaOfCircle(2.5)               // or directly in an output`},
    {t:"note",kind:"exam",label:"Examiner note",html:`<p>Three things are marked on a function header and all three are easy marks: the keyword <em class="term">FUNCTION</em>, the parameter list with types, and <em class="term">RETURNS</em> followed by the return type. Then <em class="term">RETURN</em> inside the body and <em class="term">ENDFUNCTION</em> to close. Write the header and the closing line first, before you write the logic &mdash; then you cannot forget them.</p>`},

    {t:"h",text:"BYVAL and BYREF"},
    {t:"p",html:`This is the distinction that separates a grade. By default a parameter is passed <strong>by value</strong>: the procedure gets a copy, and changing it inside has no effect outside. Passed <strong>by reference</strong>, it works on the original variable, so changes are visible to the caller.`},
    {t:"code",src:
`PROCEDURE Swap(BYREF A : INTEGER, BYREF B : INTEGER)
    DECLARE Temp : INTEGER
    Temp <- A
    A    <- B
    B    <- Temp
ENDPROCEDURE

X <- 3
Y <- 8
CALL Swap(X, Y)
OUTPUT X, " ", Y            // 8 3  -- the originals really changed`},
    {t:"code",src:
`PROCEDURE TryToChange(BYVAL N : INTEGER)
    N <- 999                // only the local copy changes
ENDPROCEDURE

Value <- 5
CALL TryToChange(Value)
OUTPUT Value                // still 5`},
    {t:"list",items:[
      `Use <strong>BYREF</strong> when the procedure must change the caller&rsquo;s variable, or when you need to send back more than one result.`,
      `Use <strong>BYVAL</strong> everywhere else. It is safer, because the procedure cannot damage data it was only meant to read.`,
      `A <strong>function</strong> sends its single answer back through <em class="term">RETURN</em>, so it rarely needs BYREF at all.`
    ]},

    {t:"h",text:"Scope"},
    {t:"p",html:`A variable declared inside a procedure or function is <strong>local</strong>: it exists only while that routine runs, and nothing outside can see it. A variable declared in the main program is <strong>global</strong> and visible everywhere. Prefer local variables and parameters &mdash; questions that ask you to &ldquo;explain an advantage&rdquo; are looking for exactly this: local variables cannot be changed accidentally by another part of the program.`},

    {t:"check",
      q:`Write a procedure that takes a price and a discount percentage by value, and returns the discounted price to the caller through a third parameter.`,
      marks:5,
      a:`<p>The third parameter must be BYREF &mdash; that is how a procedure sends a result back. Marks for: PROCEDURE header and ENDPROCEDURE; two BYVAL parameters with types; a BYREF parameter with type; correct calculation; assigning into the BYREF parameter.</p>`,
      acode:`PROCEDURE ApplyDiscount(BYVAL Price : REAL, BYVAL Percent : REAL,
                        BYREF NewPrice : REAL)
    NewPrice <- Price - (Price * Percent / 100)
ENDPROCEDURE

DECLARE Final : REAL
CALL ApplyDiscount(80.00, 25.0, Final)
OUTPUT Final                 // 60.00`}
  ]
},

{
  id:"L9", levels:["as","a2"], title:"Trace tables and dry runs",
  blurb:"Reading somebody else's algorithm and predicting exactly what it does. Slow, mechanical, and worth easy marks.",
  blocks:[
    {t:"p",html:`A trace table shows the value of every variable after each step, plus anything output. These questions are marked strictly on the values, so the method matters more than speed.`},

    {t:"h",text:"The method"},
    {t:"list",items:[
      `Draw a column for every variable the algorithm uses, and one final column headed OUTPUT.`,
      `Write one row per pass through the loop &mdash; not per line of code.`,
      `<strong>Only write a value when it changes.</strong> Leaving a cell blank means &ldquo;unchanged&rdquo;, which is what the mark scheme expects.`,
      `Evaluate the loop condition out loud each time before you start the next row. Most errors are one extra row or one missing row at the end.`,
      `Never skip ahead because you can see the pattern. The pattern is usually the trap.`
    ]},

    {t:"h",text:"A worked example"},
    {t:"code",src:
`A <- 10
B <- 3

WHILE A > 0 DO
    A <- A - B
    B <- B + 1
    OUTPUT A
ENDWHILE`},
    {t:"p",html:`Work it one pass at a time. Start: <strong>A = 10, B = 3</strong>.`},
    {t:"list",items:[
      `Pass 1 &mdash; A &gt; 0 is true. A becomes 10 &minus; 3 = <strong>7</strong>. B becomes <strong>4</strong>. Output <strong>7</strong>.`,
      `Pass 2 &mdash; 7 &gt; 0 is true. A becomes 7 &minus; 4 = <strong>3</strong>. B becomes <strong>5</strong>. Output <strong>3</strong>.`,
      `Pass 3 &mdash; 3 &gt; 0 is true. A becomes 3 &minus; 5 = <strong>&minus;2</strong>. B becomes <strong>6</strong>. Output <strong>&minus;2</strong>.`,
      `Pass 4 &mdash; &minus;2 &gt; 0 is false. The loop ends. Nothing more is output.`
    ]},
    {t:"p",html:`The output is 7, 3, &minus;2. Note that the last value output is negative: the condition is only tested at the top of the loop, so the body completes even though A has gone past zero. That is precisely what the question is testing.`},

    {t:"note",kind:"exam",label:"Examiner note",html:`<p>The two classic traps: a <em class="term">REPEAT</em> loop always runs at least once even if the condition is already true, and a <em class="term">FOR</em> loop leaves its counter one past the end when it finishes. If a question asks for the counter&rsquo;s value after the loop, that is the mark being tested.</p>`},

    {t:"h",text:"Identifying what an algorithm does"},
    {t:"p",html:`A common follow-up is &ldquo;state the purpose of this algorithm&rdquo; for one mark. Answer at the level of <em>what it achieves</em>, not <em>how</em>. &ldquo;It counts how many values in the array are negative&rdquo; scores. &ldquo;It loops through the array comparing each element to zero&rdquo; describes the mechanism and usually does not.`},

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
      a:`<p>Pass 1: Y = 0 + 1 = 1, X = 3. 3 &gt; 7 is false. Pass 2: Y = 1 + 3 = 4, X = 5. False. Pass 3: Y = 4 + 5 = 9, X = 7. 7 &gt; 7 is false &mdash; note it is <em>not</em> greater. Pass 4: Y = 9 + 7 = 16, X = 9. 9 &gt; 7 is true, stop.</p><p><strong>Output: 16 then 9. The body runs 4 times.</strong> The trap is stopping at X = 7.</p>`}
  ]
},

{
  id:"L10", levels:["as","a2"], title:"File handling",
  blurb:"Reading and writing text files, and the EOF loop that appears in almost every file question.",
  blocks:[
    {t:"p",html:`Files let data survive after the program ends. Every file operation follows the same three-step shape: <strong>open, use, close</strong>. Forgetting to close the file is a standard lost mark.`},

    {t:"h",text:"Opening and closing"},
    {t:"code",src:
`OPENFILE "Students.txt" FOR READ
OPENFILE "Students.txt" FOR WRITE      // creates new, or wipes what is there
OPENFILE "Students.txt" FOR APPEND     // adds to the end, keeps what is there

CLOSEFILE "Students.txt"`},
    {t:"note",kind:"warn",label:"WRITE destroys data",html:`<p>Opening an existing file <em class="term">FOR WRITE</em> deletes its entire contents first. If the question says &ldquo;add a new record to the file&rdquo;, the answer is <em class="term">APPEND</em>. Choosing WRITE there loses the mark and, in reality, the data.</p>`},

    {t:"h",text:"Writing to a file"},
    {t:"code",src:
`DECLARE Name : STRING

OPENFILE "Students.txt" FOR APPEND
OUTPUT "Enter student name: "
INPUT Name
WRITEFILE "Students.txt", Name
CLOSEFILE "Students.txt"`},

    {t:"h",text:"Reading until the end — the EOF loop"},
    {t:"p",html:`<em class="term">EOF(FileName)</em> returns TRUE once there is nothing left to read. Learn this exact shape; a large share of file marks are for reproducing it correctly.`},
    {t:"code",src:
`DECLARE LineOfText : STRING
DECLARE Count      : INTEGER

Count <- 0

OPENFILE "Students.txt" FOR READ

WHILE NOT EOF("Students.txt") DO
    READFILE "Students.txt", LineOfText
    OUTPUT LineOfText
    Count <- Count + 1
ENDWHILE

CLOSEFILE "Students.txt"

OUTPUT "The file holds ", Count, " records"`},
    {t:"list",items:[
      `It must be <em class="term">WHILE</em>, not <em class="term">REPEAT</em>: an empty file has to read zero lines, and a REPEAT would try to read one.`,
      `<em class="term">NOT EOF(...)</em> &mdash; carry on <em>while it is not the end</em>. Writing <em class="term">WHILE EOF(...)</em> reverses the logic and reads nothing.`,
      `<em class="term">READFILE</em> takes the file name and the variable to fill, in that order.`
    ]},

    {t:"h",text:"Searching a file"},
    {t:"code",src:
`DECLARE Target : STRING
DECLARE Line   : STRING
DECLARE Found  : BOOLEAN

Found <- FALSE
OUTPUT "Name to find: "
INPUT Target

OPENFILE "Students.txt" FOR READ

WHILE NOT EOF("Students.txt") AND Found = FALSE DO
    READFILE "Students.txt", Line
    IF Line = Target THEN
        Found <- TRUE
    ENDIF
ENDWHILE

CLOSEFILE "Students.txt"

IF Found THEN
    OUTPUT "Record located"
ELSE
    OUTPUT "No such student"
ENDIF`},

    {t:"h",text:"Random access files (Paper 4)"},
    {t:"p",html:`Serial and sequential files must be read from the start. A <strong>random</strong> file can jump straight to a record by its address, which is far faster for large files.`},
    {t:"code",src:
`OPENFILE "Stock.dat" FOR RANDOM

SEEK "Stock.dat", 25                 // move to record address 25
GETRECORD "Stock.dat", StockItem     // read it into a variable

StockItem.Quantity <- 40
SEEK "Stock.dat", 25
PUTRECORD "Stock.dat", StockItem     // write it back

CLOSEFILE "Stock.dat"`},

    {t:"check",
      q:`A text file "Scores.txt" holds one integer per line. Read the whole file and output the largest value it contains.`,
      marks:6,
      a:`<p>Marks for: opening FOR READ; a WHILE NOT EOF loop; READFILE into a variable; converting the string to a number; comparing and updating the largest; closing the file and outputting after the loop.</p>`,
      acode:`DECLARE Line    : STRING
DECLARE Value   : INTEGER
DECLARE Largest : INTEGER
DECLARE First   : BOOLEAN

First <- TRUE

OPENFILE "Scores.txt" FOR READ

WHILE NOT EOF("Scores.txt") DO
    READFILE "Scores.txt", Line
    Value <- STRING_TO_NUM(Line)

    IF First THEN                 // first value seen becomes the largest
        Largest <- Value
        First   <- FALSE
    ELSE
        IF Value > Largest THEN
            Largest <- Value
        ENDIF
    ENDIF
ENDWHILE

CLOSEFILE "Scores.txt"

OUTPUT "Largest score was ", Largest`,
      run:{ files:[{name:"Scores.txt", lines:["41","88","23"]}] }}
  ]
},

{
  id:"L11", levels:["a2"], title:"Records and user-defined types",
  blurb:"Grouping related fields of different types under one name, and storing many of them in an array.",
  blocks:[
    {t:"p",html:`An array holds many values of one type. A <strong>record</strong> holds several values of <em>different</em> types that describe one thing &mdash; a student has a name (STRING), an age (INTEGER) and an average (REAL). You define the shape once with <em class="term">TYPE</em>.`},
    {t:"code",src:
`TYPE Student
    DECLARE Name    : STRING
    DECLARE Age     : INTEGER
    DECLARE Average : REAL
    DECLARE Active  : BOOLEAN
ENDTYPE`},
    {t:"p",html:`That creates a new type, not a variable. Now declare variables of it, and reach the fields with a dot.`},
    {t:"code",src:
`DECLARE Pupil : Student

Pupil.Name    <- "Amara Okafor"
Pupil.Age     <- 17
Pupil.Average <- 74.5
Pupil.Active  <- TRUE

OUTPUT Pupil.Name, " scored ", Pupil.Average`},

    {t:"h",text:"An array of records"},
    {t:"p",html:`This is the combination questions really want: a table of data, one row per record.`},
    {t:"code",src:
`DECLARE Class : ARRAY[1:30] OF Student
DECLARE i     : INTEGER

Class[1].Name    <- "Amara Okafor"
Class[1].Average <- 74.5

// Total the averages of the active students only
DECLARE Total : REAL
DECLARE Count : INTEGER

Total <- 0
Count <- 0

FOR i <- 1 TO 30
    IF Class[i].Active THEN
        Total <- Total + Class[i].Average
        Count <- Count + 1
    ENDIF
NEXT i

IF Count > 0 THEN
    OUTPUT "Class average: ", Total / Count
ELSE
    OUTPUT "No active students"
ENDIF`},
    {t:"note",kind:"exam",label:"Examiner note",html:`<p>Guarding a division with <em class="term">IF Count &gt; 0</em> is frequently an explicit mark. Any time you divide by something you counted, ask what happens when the count is zero.</p>`},

    {t:"h",text:"Enumerated and pointer types (Paper 4)"},
    {t:"code",src:
`TYPE TDay = (Monday, Tuesday, Wednesday, Thursday, Friday)

DECLARE Today : TDay
Today <- Wednesday                // no quotes -- these are not strings`},
    {t:"p",html:`A <strong>pointer</strong> type holds the address of another item rather than a value. It is what makes linked lists possible.`},
    {t:"code",src:
`TYPE TNode
    DECLARE Data    : INTEGER
    DECLARE Pointer : INTEGER      // index of the next node, 0 means none
ENDTYPE

DECLARE List : ARRAY[1:100] OF TNode`},

    {t:"check",
      q:`Define a record type for a library book holding a title, an author, a 13-character ISBN and whether it is on loan. Then declare an array able to hold 500 of them, and mark the first book as on loan.`,
      marks:5,
      a:`<p>Marks for: TYPE and ENDTYPE; four correctly typed fields; declaring an array of the new type with the right bounds; correct dot notation with an index.</p>`,
      acode:`TYPE Book
    DECLARE Title  : STRING
    DECLARE Author : STRING
    DECLARE ISBN   : STRING
    DECLARE OnLoan : BOOLEAN
ENDTYPE

DECLARE Library : ARRAY[1:500] OF Book

Library[1].Title  <- "Things Fall Apart"
Library[1].Author <- "Chinua Achebe"
Library[1].ISBN   <- "9780385474542"
Library[1].OnLoan <- TRUE`}
  ]
},

{
  id:"L12", levels:["a2"], title:"Classes and objects (Paper 4)",
  blurb:"Encapsulation, constructors, getters and setters, and inheritance — written the way the syllabus writes them.",
  blocks:[
    {t:"p",html:`A record groups data. A <strong>class</strong> groups data <em>and</em> the operations on it, then hides the data so that nothing outside can corrupt it. That hiding is called <strong>encapsulation</strong>, and it is the point of the whole topic.`},

    {t:"h",text:"Defining a class"},
    {t:"code",src:
`CLASS BankAccount
    PRIVATE AccountNumber : STRING
    PRIVATE Balance       : REAL

    PUBLIC PROCEDURE NEW(Num : STRING, Opening : REAL)
        AccountNumber <- Num
        Balance       <- Opening
    ENDPROCEDURE

    PUBLIC PROCEDURE Deposit(Amount : REAL)
        IF Amount > 0 THEN
            Balance <- Balance + Amount
        ENDIF
    ENDPROCEDURE

    PUBLIC FUNCTION GetBalance() RETURNS REAL
        RETURN Balance
    ENDFUNCTION
ENDCLASS`},
    {t:"list",items:[
      `Attributes are <strong>PRIVATE</strong>. This is not a style preference &mdash; a mark scheme will say &ldquo;attributes declared private&rdquo;.`,
      `Methods that the outside world uses are <strong>PUBLIC</strong>.`,
      `The constructor is always a procedure named <strong>NEW</strong>.`,
      `A <strong>getter</strong> is a function returning a private attribute. A <strong>setter</strong> is a procedure that changes one, ideally validating first &mdash; as <em class="term">Deposit</em> does above.`
    ]},

    {t:"h",text:"Creating and using an object"},
    {t:"code",src:
`DECLARE Current : BankAccount

Current <- NEW BankAccount("40915772", 250.00)

CALL Current.Deposit(75.50)
OUTPUT "Balance is ", Current.GetBalance()       // 325.50`},
    {t:"note",kind:"warn",label:"Two different calls",html:`<p>A <strong>procedure</strong> method needs <em class="term">CALL</em> in front of it. A <strong>function</strong> method does not &mdash; it is used inside an expression or output, because it gives a value back. Mixing these up is one of the most common Paper 4 slips.</p>`},

    {t:"h",text:"Inheritance"},
    {t:"p",html:`A subclass gains everything its superclass has, then adds or replaces. Use <em class="term">SUPER</em> to reach the parent&rsquo;s version.`},
    {t:"code",src:
`CLASS SavingsAccount INHERITS BankAccount
    PRIVATE InterestRate : REAL

    PUBLIC PROCEDURE NEW(Num : STRING, Opening : REAL, Rate : REAL)
        CALL SUPER.NEW(Num, Opening)      // let the parent set up its own part
        InterestRate <- Rate
    ENDPROCEDURE

    PUBLIC PROCEDURE AddInterest()
        CALL Deposit(GetBalance() * InterestRate / 100)
    ENDPROCEDURE
ENDCLASS`},
    {t:"p",html:`Notice that <em class="term">AddInterest</em> cannot touch <em class="term">Balance</em> directly &mdash; it is private to the parent. It goes through the public <em class="term">Deposit</em> and <em class="term">GetBalance</em> methods instead. That is encapsulation working as intended, and saying so is usually worth a mark in a written question.`},

    {t:"h",text:"The vocabulary questions ask for"},
    {t:"list",items:[
      `<strong>Class</strong> &mdash; a template or blueprint describing attributes and methods.`,
      `<strong>Object</strong> &mdash; one instance created from that class, with its own values.`,
      `<strong>Instantiation</strong> &mdash; the act of creating an object from a class using <em class="term">NEW</em>.`,
      `<strong>Encapsulation</strong> &mdash; keeping attributes private and exposing them only through methods, so data cannot be set to an invalid value.`,
      `<strong>Inheritance</strong> &mdash; a subclass acquiring the attributes and methods of a superclass, avoiding duplicated code.`,
      `<strong>Polymorphism</strong> &mdash; a subclass supplying its own version of an inherited method, so the same call behaves correctly for each type.`
    ]},

    {t:"check",
      q:`Write a class Rectangle with private width and height, a constructor, a function returning the area, and a method that scales both dimensions by a factor.`,
      marks:7,
      a:`<p>Marks for: CLASS and ENDCLASS; two private attributes with types; a NEW constructor assigning both; a public FUNCTION with RETURNS REAL; correct area calculation; a public scaling procedure; correct use of PUBLIC and PRIVATE throughout.</p>`,
      acode:`CLASS Rectangle
    PRIVATE Width  : REAL
    PRIVATE Height : REAL

    PUBLIC PROCEDURE NEW(W : REAL, H : REAL)
        Width  <- W
        Height <- H
    ENDPROCEDURE

    PUBLIC FUNCTION GetArea() RETURNS REAL
        RETURN Width * Height
    ENDFUNCTION

    PUBLIC PROCEDURE Scale(Factor : REAL)
        IF Factor > 0 THEN
            Width  <- Width * Factor
            Height <- Height * Factor
        ENDIF
    ENDPROCEDURE
ENDCLASS

DECLARE Shape : Rectangle
Shape <- NEW Rectangle(4.0, 2.5)
CALL Shape.Scale(2.0)
OUTPUT Shape.GetArea()              // 40.0`}
  ]
},

{
  id:"L13", levels:["as","a2"], title:"Turning a question into an algorithm",
  blurb:"The method to use when you read a long question and do not know where to start.",
  blocks:[
    {t:"p",html:`Most people lose marks on long pseudocode questions not because they cannot code, but because they start writing before they know what they are writing. Five minutes of structure beats twenty minutes of guessing.`},

    {t:"h",text:"Step 1 — underline the verbs"},
    {t:"p",html:`Read the question with a pen. Every instruction verb is a step of the algorithm and usually a mark: <em>input</em>, <em>validate</em>, <em>count</em>, <em>total</em>, <em>compare</em>, <em>store</em>, <em>output</em>. A question with six verbs is roughly a six-mark answer, and the order they appear in is usually the order to write them.`},

    {t:"h",text:"Step 2 — list the data before the logic"},
    {t:"p",html:`Write the declarations first. What is coming in, what is being accumulated, what is going out. Doing this reveals what you have missed: if you are asked for an average and have no counter, you now know a counter is needed.`},

    {t:"h",text:"Step 3 — choose the loop, then fill it"},
    {t:"p",html:`Decide the shape before the detail: is this fixed repetition (FOR), condition-controlled (WHILE), or must-run-once validation (REPEAT)? Write the opening and closing lines of the loop immediately, then write the body inside them. You cannot then forget <em class="term">NEXT</em> or <em class="term">ENDWHILE</em>.`},

    {t:"h",text:"Step 4 — handle the edge, then output"},
    {t:"p",html:`Before you finish, ask the three questions that cost marks: what if there are zero items? What if nothing matched? What if the input is out of range? A single <em class="term">IF</em> guarding a division or a &ldquo;not found&rdquo; message is often a whole mark.`},

    {t:"h",text:"A worked example"},
    {t:"p",html:`<em>&ldquo;A teacher enters the marks for 20 students. Marks must be between 0 and 100. The program outputs the class average and how many students passed, where a pass is 50 or more.&rdquo;</em>`},
    {t:"p",html:`Verbs: <strong>enters</strong> (20 times, known count &rarr; FOR), <strong>must be between</strong> (validation &rarr; REPEAT inside the FOR), <strong>average</strong> (needs a total), <strong>how many passed</strong> (needs a counter), <strong>outputs</strong> (after the loop).`},
    {t:"code",src:
`CONSTANT ClassSize = 20
CONSTANT PassMark  = 50

DECLARE Mark    : INTEGER
DECLARE Total   : INTEGER
DECLARE Passes  : INTEGER
DECLARE i       : INTEGER

Total  <- 0                                   // step 2: the accumulators
Passes <- 0

FOR i <- 1 TO ClassSize                       // step 3: known count
    REPEAT                                    // validation must ask once
        OUTPUT "Enter mark for student ", i, ": "
        INPUT Mark
        IF Mark < 0 OR Mark > 100 THEN
            OUTPUT "Mark must be from 0 to 100"
        ENDIF
    UNTIL Mark >= 0 AND Mark <= 100

    Total <- Total + Mark
    IF Mark >= PassMark THEN
        Passes <- Passes + 1
    ENDIF
NEXT i

OUTPUT "Class average: ", Total / ClassSize   // step 4: report after the loop
OUTPUT Passes, " out of ", ClassSize, " passed"`},

    {t:"note",kind:"exam",label:"Timing",html:`<p>Marks are spread evenly, so never spend fifteen minutes perfecting a six-mark question while a later one sits blank. If you are stuck, write the declarations, the loop skeleton and the output lines, leave the hard middle, and come back. A skeleton with the right structure reliably scores; a blank page never does.</p>`},

    {t:"check",
      q:`Apply the method to this, writing only the declarations and the loop skeleton — no body: "Numbers are entered until a negative number is entered. Output the largest number entered and how many were entered."`,
      marks:4,
      a:`<p>Unknown count and the first value must be read before it can be tested, so it is an input-before-WHILE. Marks for: sensible declarations including a counter and a largest-so-far; the priming input before the loop; the correct loop condition; the re-input inside the loop.</p>`,
      acode:`DECLARE Number  : INTEGER
DECLARE Largest : INTEGER
DECLARE Count   : INTEGER

Count   <- 0
Largest <- 0

OUTPUT "Enter a number (negative to stop): "
INPUT Number                       // priming read

WHILE Number >= 0 DO
    // ... body goes here ...
    OUTPUT "Enter a number (negative to stop): "
    INPUT Number
ENDWHILE

OUTPUT "Largest: ", Largest, "  Count: ", Count`,
      run:{ inputs:"4\n9\n-1" }}
  ]
}
];

