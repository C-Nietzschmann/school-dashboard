/* ============================================================================
   IGCSE 0478 QUESTION BANK
   Original questions in the style of Paper 2, using IGCSE notation only:
   SUBSTRING, UCASE, LCASE, ROUND, RANDOM. No records, classes or recursion.
   ========================================================================== */
"use strict";
var __g = (typeof window !== "undefined") ? window : globalThis;

__g.QUESTIONS_IGCSE = [

/* ---------------- VARIABLES ---------------- */
{ id:"I01", level:"igcse", topic:"Variables", paper:2, diff:1, marks:4, kind:"code",
  title:"Setting up a canteen till",
  stem:`<p>A school canteen till stores, for one purchase: the pupil's name, the number of items bought, the total price in dollars and cents, and whether the pupil is entitled to a free meal.</p>
        <p>A service charge of 0.30 is added to every purchase and never changes.</p>
        <p>Write the declarations, then set the number of items to 3 and mark the pupil as not entitled to a free meal.</p>`,
  tips:[`Four pieces of data means four variables, but the service charge is not a variable. Which keyword is used for a value that never changes?`,
        `Go through the list naming a type for each. "Dollars and cents" means a fractional part. "Whether or not" is always BOOLEAN.`,
        `<code>DECLARE Identifier : TYPE</code> for each, <code>CONSTANT Name &#8592; Value</code> for the fixed one, then two assignment lines. BOOLEAN values are TRUE and FALSE with no quotes.`],
  model:
`CONSTANT ServiceCharge <- 0.30

DECLARE PupilName : STRING
DECLARE ItemCount : INTEGER
DECLARE TotalPrice : REAL
DECLARE FreeMeal : BOOLEAN

ItemCount <- 3
FreeMeal  <- FALSE

OUTPUT ItemCount, " ", FreeMeal`,
  ms:[{m:1,t:"CONSTANT used for the service charge."},
      {m:1,t:"STRING for the name and INTEGER for the item count."},
      {m:1,t:"REAL for the total price and BOOLEAN for the free meal flag."},
      {m:1,t:"Both assignments use the arrow, and FALSE is written without quotes."}] },

{ id:"I02", level:"igcse", topic:"Variables", paper:2, diff:1, marks:3, kind:"code",
  title:"Swapping without a swap",
  stem:`<p>Two INTEGER variables <code>First</code> and <code>Second</code> already hold 12 and 30.</p>
        <p>Exchange their contents so that <code>First</code> holds 30 and <code>Second</code> holds 12. Output both afterwards.</p>`,
  tips:[`If you write <code>First &#8592; Second</code> as your first line, the original value of First is gone forever. You need somewhere to put it.`,
        `Introduce a third variable to hold one value temporarily.`,
        `Three lines: save First into Temp, copy Second into First, copy Temp into Second. Two lines can never do it.`],
  run:{ setup:"DECLARE First, Second : INTEGER\nFirst <- 12\nSecond <- 30" },
  model:
`DECLARE Temp : INTEGER

Temp   <- First      // save it before it is overwritten
First  <- Second
Second <- Temp

OUTPUT First, " ", Second`,
  ms:[{m:1,t:"A third variable declared to hold a value temporarily."},
      {m:1,t:"The three assignments are in a workable order."},
      {m:1,t:"Both values output after the exchange."}] },

/* ---------------- OPERATORS ---------------- */
{ id:"I03", level:"igcse", topic:"Operators", paper:2, diff:2, marks:5, kind:"code",
  title:"Seconds into minutes and seconds",
  stem:`<p>A whole number of seconds is input. Output the equivalent time in whole minutes and remaining seconds.</p>
        <p>For example an input of <code>200</code> should produce <code>3 minutes 20 seconds</code>.</p>
        <p>You must use the built-in functions rather than repeated subtraction.</p>`,
  tips:[`Two functions do all the work: one gives the whole-number part of a division, the other gives what is left over.`,
        `Sixty seconds make a minute. How many whole 60s fit into the input, and what remains?`,
        `<code>DIV(Total, 60)</code> gives the minutes and <code>MOD(Total, 60)</code> gives the seconds.`],
  run:{ inputs:"200" },
  model:
`DECLARE TotalSecs, Mins, Secs : INTEGER

OUTPUT "Enter a number of seconds: "
INPUT TotalSecs

Mins <- DIV(TotalSecs, 60)
Secs <- MOD(TotalSecs, 60)

OUTPUT Mins, " minutes ", Secs, " seconds"`,
  ms:[{m:1,t:"Variables declared as INTEGER."},
      {m:1,t:"A value input into a variable, with the prompt on its own OUTPUT line."},
      {m:1,t:"DIV used by 60 to find the minutes."},
      {m:1,t:"MOD used by 60 to find the remaining seconds."},
      {m:1,t:"A single output producing both values in a readable form."}] },

{ id:"I04", level:"igcse", topic:"Operators", paper:2, diff:2, marks:5, kind:"code",
  title:"Odd, even or zero",
  stem:`<p>A whole number is input. Output whether it is <code>Zero</code>, <code>Even</code> or <code>Odd</code>.</p>
        <p>Negative numbers must be handled correctly: &minus;4 is even.</p>`,
  tips:[`Test for zero first and get it out of the way, then decide between even and odd.`,
        `A number is even when dividing it by 2 leaves no remainder. There is a function that gives you the remainder.`,
        `<code>MOD(N, 2) = 0</code> is the even test. It works for negative numbers too, so you do not need a special case.`],
  run:{ inputs:"-4" },
  model:
`DECLARE N : INTEGER

OUTPUT "Enter a whole number: "
INPUT N

IF N = 0 THEN
    OUTPUT "Zero"
ELSE
    IF MOD(N, 2) = 0 THEN
        OUTPUT "Even"
    ELSE
        OUTPUT "Odd"
    ENDIF
ENDIF`,
  ms:[{m:1,t:"A value input into a declared INTEGER variable."},
      {m:1,t:"Zero tested separately before the even/odd decision."},
      {m:1,t:"MOD by 2 used to test for evenness."},
      {m:1,t:"The comparison is against 0 and the odd case is the ELSE."},
      {m:1,t:"Every IF has a matching ENDIF and the blocks are indented."}] },

{ id:"I05", level:"igcse", topic:"Operators", paper:2, diff:3, marks:5, kind:"code",
  title:"Splitting a price",
  stem:`<p>A price is held in cents as a whole number, for example <code>1275</code>.</p>
        <p>Output it as dollars and cents in the form <code>$12.75</code>. Cents below ten must still show two digits, so 1205 becomes <code>$12.05</code>.</p>`,
  tips:[`DIV by 100 gives the dollars, MOD by 100 gives the cents.`,
        `The awkward part is a cents value below 10, which would print as <code>$12.5</code> instead of <code>$12.05</code>.`,
        `Test whether the cents are less than 10 and, if so, output an extra "0" before them.`],
  run:{ inputs:"1205" },
  model:
`DECLARE Cents, Dollars, Remainder : INTEGER

OUTPUT "Enter the price in cents: "
INPUT Cents

Dollars   <- DIV(Cents, 100)
Remainder <- MOD(Cents, 100)

IF Remainder < 10 THEN
    OUTPUT "$", Dollars, ".0", Remainder     // pad the single digit
ELSE
    OUTPUT "$", Dollars, ".", Remainder
ENDIF`,
  ms:[{m:1,t:"Dollars found with DIV by 100."},
      {m:1,t:"Remaining cents found with MOD by 100."},
      {m:1,t:"A test for a cents value below 10."},
      {m:1,t:"An extra zero output in that case."},
      {m:1,t:"Both branches produce a correctly formed price."}] },

/* ---------------- SELECTION ---------------- */
{ id:"I06", level:"igcse", topic:"Selection", paper:2, diff:2, marks:5, kind:"code",
  title:"Grading a test",
  stem:`<p>A percentage mark is input. Output the grade using these boundaries:</p>
        <ul><li>70 or more &mdash; Distinction</li><li>55 to 69 &mdash; Merit</li><li>40 to 54 &mdash; Pass</li><li>below 40 &mdash; Fail</li></ul>`,
  tips:[`Order the tests from the top down. Once you have ruled out "70 or more", you do not need to test the upper end of the next band.`,
        `Each band then needs only one comparison.`,
        `<code>IF Mark >= 70 THEN ... ELSE IF Mark >= 55 THEN ...</code> and so on, each nested inside the previous ELSE. "70 or more" is <code>>=</code>, not <code>></code>.`],
  run:{ inputs:"62" },
  model:
`DECLARE Mark : INTEGER

OUTPUT "Enter the mark: "
INPUT Mark

IF Mark >= 70 THEN
    OUTPUT "Distinction"
ELSE
    IF Mark >= 55 THEN               // already know it is under 70
        OUTPUT "Merit"
    ELSE
        IF Mark >= 40 THEN
            OUTPUT "Pass"
        ELSE
            OUTPUT "Fail"
        ENDIF
    ENDIF
ENDIF`,
  ms:[{m:1,t:"Mark declared and input."},
      {m:1,t:"The first boundary uses >= 70."},
      {m:1,t:"Bands tested in order so each needs only one comparison."},
      {m:1,t:"All four grades can be produced."},
      {m:1,t:"Every IF has a matching ENDIF and the code is indented."}] },

{ id:"I07", level:"igcse", topic:"Selection", paper:2, diff:2, marks:5, kind:"code",
  title:"A menu with CASE",
  stem:`<p>A library terminal shows a menu and stores the choice in an INTEGER variable <code>Option</code>:</p>
        <ul><li>1 &mdash; borrow a book</li><li>2 &mdash; return a book</li><li>3 &mdash; search the catalogue</li><li>9 &mdash; quit</li></ul>
        <p>Write the selection statement. Each option outputs a suitable message. Anything else must produce an error message saying which options are valid.</p>`,
  tips:[`You are comparing one variable against a list of specific values. One construct exists for exactly that, and it is shorter than four nested IFs.`,
        `Do not forget the branch that catches everything you have not listed.`,
        `<code>CASE OF Option</code>, then one line per value as <code>value : statement</code>, then <code>OTHERWISE : statement</code>, closed with <code>ENDCASE</code>.`],
  run:{ inputs:"3" },
  model:
`DECLARE Option : INTEGER

OUTPUT "Enter your choice: "
INPUT Option

CASE OF Option
    1        : OUTPUT "Borrowing a book"
    2        : OUTPUT "Returning a book"
    3        : OUTPUT "Searching the catalogue"
    9        : OUTPUT "Goodbye"
    OTHERWISE: OUTPUT "Invalid - enter 1, 2, 3 or 9"
ENDCASE`,
  ms:[{m:1,t:"CASE OF used with the correct variable and closed with ENDCASE."},
      {m:1,t:"Options 1, 2 and 3 each produce their own message."},
      {m:1,t:"Option 9 produces a closing message."},
      {m:1,t:"An OTHERWISE branch is present."},
      {m:1,t:"Colons separate each value from its statement and the message names the valid options."}] },

{ id:"I08", level:"igcse", topic:"Selection", paper:2, diff:3, marks:6, kind:"code",
  title:"Cinema ticket price",
  stem:`<p>A cinema charges by age: under 5 free, 5 to 15 costs 4.50, 16 to 64 costs 9.00, and 65 or over costs 6.00.</p>
        <p>On a Tuesday every paying customer gets 2.00 off, but the price can never go below zero.</p>
        <p>An age and a BOOLEAN <code>IsTuesday</code> are input. Output the price.</p>`,
  tips:[`Work out the basic price from the age bands first, then apply the discount to whatever you calculated.`,
        `Do not try to build the discount into every band - that is four places to get it wrong instead of one.`,
        `After the IF structure sets Price, use a separate <code>IF IsTuesday THEN Price &#8592; Price - 2.00 ENDIF</code>, then guard it with <code>IF Price &lt; 0 THEN Price &#8592; 0 ENDIF</code>.`],
  run:{ inputs:"12\nTRUE" },
  model:
`DECLARE Age : INTEGER
DECLARE IsTuesday : BOOLEAN
DECLARE Price : REAL

OUTPUT "Enter age: "
INPUT Age
OUTPUT "Tuesday (TRUE/FALSE)? "
INPUT IsTuesday

IF Age < 5 THEN
    Price <- 0
ELSE
    IF Age <= 15 THEN
        Price <- 4.50
    ELSE
        IF Age <= 64 THEN
            Price <- 9.00
        ELSE
            Price <- 6.00
        ENDIF
    ENDIF
ENDIF

IF IsTuesday THEN                 // one discount, applied once
    Price <- Price - 2.00
ENDIF

IF Price < 0 THEN                 // never below zero
    Price <- 0
ENDIF

OUTPUT "Price: ", Price`,
  ms:[{m:1,t:"Age and the Tuesday flag both input into correctly typed variables."},
      {m:1,t:"Under 5 gives a price of zero."},
      {m:1,t:"The three paying bands use correct boundaries at 15 and 64."},
      {m:1,t:"The discount is applied once, after the bands, not inside each one."},
      {m:1,t:"The discount is conditional on the Tuesday flag."},
      {m:1,t:"A guard prevents the price falling below zero."}] },

/* ---------------- ITERATION ---------------- */
{ id:"I09", level:"igcse", topic:"Iteration", paper:2, diff:1, marks:4, kind:"code",
  title:"A times table",
  stem:`<p>A whole number is input. Output its times table from 1 to 12, one line each, in the form <code>7 x 3 = 21</code>.</p>`,
  tips:[`You know exactly how many lines are needed before you start, so this is the loop that counts.`,
        `The loop counter is the number you are multiplying by.`,
        `<code>FOR i &#8592; 1 TO 12</code> &hellip; <code>NEXT i</code>, and inside, output the three parts and the product.`],
  run:{ inputs:"7" },
  model:
`DECLARE N, i : INTEGER

OUTPUT "Enter a number: "
INPUT N

FOR i <- 1 TO 12
    OUTPUT N, " x ", i, " = ", N * i
NEXT i`,
  ms:[{m:1,t:"A FOR loop running from 1 to 12."},
      {m:1,t:"NEXT names the same counter as the FOR."},
      {m:1,t:"The product is calculated using the counter."},
      {m:1,t:"The output is laid out in the form asked for."}] },

{ id:"I10", level:"igcse", topic:"Iteration", paper:2, diff:2, marks:5, kind:"code",
  title:"Validating a PIN length",
  stem:`<p>A four-digit PIN is entered as a whole number. It must be between 1000 and 9999 inclusive.</p>
        <p>Keep asking until a valid PIN is entered, showing a helpful message each time one is rejected. Then confirm it was accepted.</p>`,
  tips:[`You have to ask once before you can know whether the answer is valid. Which of the three loops guarantees the body runs at least once?`,
        `The loop stops when its condition becomes <em>true</em>, so the condition should describe a <em>valid</em> PIN.`,
        `<code>REPEAT</code> &hellip; <code>UNTIL Pin >= 1000 AND Pin <= 9999</code>. Put the prompt, the input and the error message all inside the loop.`],
  run:{ inputs:"55\n4821" },
  model:
`DECLARE Pin : INTEGER

REPEAT
    OUTPUT "Enter your four-digit PIN: "
    INPUT Pin

    IF Pin < 1000 OR Pin > 9999 THEN
        OUTPUT "A PIN must have exactly four digits."
    ENDIF
UNTIL Pin >= 1000 AND Pin <= 9999

OUTPUT "PIN accepted"`,
  ms:[{m:1,t:"REPEAT ... UNTIL chosen, so the PIN is always asked for at least once."},
      {m:1,t:"Prompt and INPUT both inside the loop."},
      {m:1,t:"The condition describes a valid PIN using AND with inclusive boundaries."},
      {m:1,t:"An error message shown only when the entry is rejected."},
      {m:1,t:"Confirmation output after the loop has ended."}] },

{ id:"I11", level:"igcse", topic:"Iteration", paper:2, diff:3, marks:6, kind:"code",
  title:"Totalling until a sentinel",
  stem:`<p>A market stall records each sale. The trader enters a value for every sale and enters <code>-1</code> to close for the day.</p>
        <p>Output the total takings, the number of sales, and the average sale. The <code>-1</code> must not be counted or added.</p>
        <p>Make sure your algorithm behaves sensibly if the very first entry is <code>-1</code>.</p>`,
  tips:[`You do not know how many sales there will be. The catch is you must read a value before you can test whether it is the sentinel.`,
        `Read the first value <em>before</em> the loop, then inside the loop process it and read the next one. INPUT appears twice.`,
        `The final mark is the empty-day case: <code>Total / Count</code> divides by zero when nothing was sold. Guard it with <code>IF Count > 0 THEN</code>.`],
  run:{ inputs:"12.50\n8.00\n25.75\n-1" },
  model:
`DECLARE Sale, Total : REAL
DECLARE Count : INTEGER

Total <- 0
Count <- 0

OUTPUT "Enter sale value (-1 to finish): "
INPUT Sale                           // read once before the loop

WHILE Sale <> -1 DO
    Total <- Total + Sale
    Count <- Count + 1

    OUTPUT "Enter sale value (-1 to finish): "
    INPUT Sale                       // read the next one
ENDWHILE

OUTPUT "Sales: ", Count
OUTPUT "Takings: ", Total

IF Count > 0 THEN
    OUTPUT "Average: ", Total / Count
ELSE
    OUTPUT "No sales today"
ENDIF`,
  ms:[{m:1,t:"Total and count both initialised to zero before the loop."},
      {m:1,t:"A first input before the loop begins."},
      {m:1,t:"A WHILE loop with a condition that stops on the sentinel."},
      {m:1,t:"Total accumulated and count increased inside the loop."},
      {m:1,t:"A second input inside the loop so the sentinel is excluded."},
      {m:1,t:"The division is guarded against a count of zero."}] },

{ id:"I12", level:"igcse", topic:"Iteration", paper:2, diff:3, marks:5, kind:"code",
  title:"Counting down in steps",
  stem:`<p>Output every multiple of 5 from 100 down to 5 inclusive, one per line, then output how many numbers were printed.</p>`,
  tips:[`You know the count before you start, so use the counting loop.`,
        `You need to go downwards in fives. There is a keyword that sets the size and direction of each step.`,
        `<code>FOR i &#8592; 100 TO 5 STEP -5</code> &hellip; <code>NEXT i</code>. Keep a separate counter, set to zero before the loop.`],
  model:
`DECLARE i, Count : INTEGER

Count <- 0

FOR i <- 100 TO 5 STEP -5
    OUTPUT i
    Count <- Count + 1
NEXT i

OUTPUT Count, " numbers printed"`,
  ms:[{m:1,t:"A FOR loop with start 100 and end 5."},
      {m:1,t:"STEP -5 used to count downwards in fives."},
      {m:1,t:"NEXT names the same counter as the FOR."},
      {m:1,t:"A counter initialised to zero before the loop and increased inside it."},
      {m:1,t:"The count output after the loop, not inside it."}] },

/* ---------------- ARRAYS ---------------- */
{ id:"I13", level:"igcse", topic:"Arrays", paper:2, diff:2, marks:5, kind:"code",
  title:"Average rainfall",
  stem:`<p>An array <code>Rainfall</code> declared as <code>ARRAY[1:12] OF REAL</code> already holds the monthly rainfall in millimetres.</p>
        <p>Calculate and output the mean, and then how many months were above that mean.</p>`,
  tips:[`You cannot know which months are above the mean until you have the mean. That means two passes over the array.`,
        `First loop: add every element to a running total, then divide by 12. Second loop: compare each element against the mean.`,
        `Both loops are <code>FOR i &#8592; 1 TO 12</code>. Set Total and Count to zero before their loops. Do not try to combine them.`],
  run:{ setup:"DECLARE Rainfall : ARRAY[1:12] OF REAL\nDECLARE Seed : INTEGER\nFOR Seed <- 1 TO 12\n    Rainfall[Seed] <- Seed * 7.5\nNEXT Seed" },
  model:
`DECLARE i, Count : INTEGER
DECLARE Total, Mean : REAL

Total <- 0
Count <- 0

FOR i <- 1 TO 12                  // first pass: find the mean
    Total <- Total + Rainfall[i]
NEXT i

Mean <- Total / 12

FOR i <- 1 TO 12                  // second pass: count above it
    IF Rainfall[i] > Mean THEN
        Count <- Count + 1
    ENDIF
NEXT i

OUTPUT "Mean: ", Mean
OUTPUT Count, " months above the mean"`,
  ms:[{m:1,t:"Total initialised to zero before the first loop."},
      {m:1,t:"A FOR loop from 1 to 12 accumulating every element."},
      {m:1,t:"The mean calculated by dividing by 12."},
      {m:1,t:"A second loop comparing each element against the mean."},
      {m:1,t:"A counter increased on each match and both results output after the loops."}] },

{ id:"I14", level:"igcse", topic:"Arrays", paper:2, diff:3, marks:6, kind:"code",
  title:"Highest score and its position",
  stem:`<p>An array <code>Scores</code> of <code>ARRAY[1:20] OF INTEGER</code> holds test scores. Absent pupils are recorded as <code>-1</code>.</p>
        <p>Find and output the highest score and the position it is stored at. If the highest score appears more than once, report the <strong>first</strong> position.</p>`,
  tips:[`Do not start your "highest so far" at zero. Think about what happens if every entry is -1.`,
        `Assume the first element is the highest and record position 1, then compare every element from the second onwards.`,
        `Use a strictly greater-than test. <code>>=</code> would overwrite the position each time the value ties, giving the last occurrence instead of the first.`],
  run:{ setup:"DECLARE Scores : ARRAY[1:20] OF INTEGER\nDECLARE Seed : INTEGER\nFOR Seed <- 1 TO 20\n    Scores[Seed] <- MOD(Seed * 7, 23) - 1\nNEXT Seed" },
  model:
`DECLARE i, Highest, Position : INTEGER

Highest  <- Scores[1]        // never assume 0
Position <- 1

FOR i <- 2 TO 20             // element 1 is already the benchmark
    IF Scores[i] > Highest THEN     // > keeps the FIRST occurrence
        Highest  <- Scores[i]
        Position <- i
    ENDIF
NEXT i

OUTPUT "Highest: ", Highest
OUTPUT "First at position ", Position`,
  ms:[{m:1,t:"Highest initialised to the first element, not to zero."},
      {m:1,t:"Position initialised to 1."},
      {m:1,t:"A FOR loop covering the remaining elements with correct bounds."},
      {m:1,t:"The comparison is strictly greater than, so the first occurrence is kept."},
      {m:1,t:"Value and position updated together inside the IF."},
      {m:1,t:"Both results output after the loop."}] },

{ id:"I15", level:"igcse", topic:"Arrays", paper:2, diff:3, marks:6, kind:"code",
  title:"Searching an array",
  stem:`<p>An array <code>Names</code> of <code>ARRAY[1:30] OF STRING</code> holds pupil names in no particular order.</p>
        <p>A name is input. Output the position it was found at, or a message that it is not in the list.</p>
        <p>The search must stop as soon as the name is found.</p>`,
  tips:[`To stop early you need a loop whose condition can become false part-way through. A plain FOR loop cannot do that neatly.`,
        `Use a BOOLEAN flag alongside the index, and test both in the loop condition.`,
        `<code>WHILE Index &lt;= 30 AND Found = FALSE DO</code>. Inside, if the element matches set Found to TRUE, otherwise increase the index. Only increase it in the ELSE, or you will report the wrong position.`],
  run:{ setup:"DECLARE Names : ARRAY[1:30] OF STRING\nDECLARE Seed : INTEGER\nFOR Seed <- 1 TO 30\n    Names[Seed] <- \"Pupil\" & NUM_TO_STRING(Seed)\nNEXT Seed", inputs:"Pupil17" },
  model:
`DECLARE Target : STRING
DECLARE Index : INTEGER
DECLARE Found : BOOLEAN

OUTPUT "Name to find: "
INPUT Target

Index <- 1
Found <- FALSE

WHILE Index <= 30 AND Found = FALSE DO
    IF Names[Index] = Target THEN
        Found <- TRUE
    ELSE
        Index <- Index + 1        // only move on if it did NOT match
    ENDIF
ENDWHILE

IF Found THEN
    OUTPUT Target, " is at position ", Index
ELSE
    OUTPUT Target, " is not in the list"
ENDIF`,
  ms:[{m:1,t:"A name input into a STRING variable."},
      {m:1,t:"Index and a Boolean flag both initialised before the loop."},
      {m:1,t:"The loop condition tests both the array bound and the flag."},
      {m:1,t:"The array element is compared against the target."},
      {m:1,t:"The index is increased only when there is no match."},
      {m:1,t:"Different messages for found and not found, using the flag."}] },

{ id:"I16", level:"igcse", topic:"Arrays", paper:2, diff:4, marks:6, kind:"code",
  title:"Row totals from a grid",
  stem:`<p>An array <code>Sales</code> declared as <code>ARRAY[1:4, 1:7] OF INTEGER</code> holds the number of items sold by 4 shops on each of 7 days. The first index is the shop, the second is the day.</p>
        <p>Output the weekly total for each shop, and then the single day number on which all four shops combined sold the most.</p>`,
  tips:[`Two separate jobs. Totalling per shop means the shop index is the outer loop; finding the best day means the day index must be the outer loop.`,
        `Reset the running total at the <em>start of each shop</em> - inside the outer loop, not before it. Forgetting this is the classic error here.`,
        `For the best day, total each day's column, then compare against a "best so far" that you initialise from day 1 rather than from zero.`],
  run:{ setup:"DECLARE Sales : ARRAY[1:4, 1:7] OF INTEGER\nDECLARE R, C : INTEGER\nFOR R <- 1 TO 4\n    FOR C <- 1 TO 7\n        Sales[R, C] <- MOD(R * C * 3, 17) + 2\n    NEXT C\nNEXT R" },
  model:
`DECLARE Shop, Day : INTEGER
DECLARE ShopTotal, DayTotal, BestTotal, BestDay : INTEGER

FOR Shop <- 1 TO 4
    ShopTotal <- 0                 // reset INSIDE the outer loop
    FOR Day <- 1 TO 7
        ShopTotal <- ShopTotal + Sales[Shop, Day]
    NEXT Day
    OUTPUT "Shop ", Shop, " sold ", ShopTotal
NEXT Shop

BestTotal <- -1
BestDay   <- 0

FOR Day <- 1 TO 7
    DayTotal <- 0
    FOR Shop <- 1 TO 4
        DayTotal <- DayTotal + Sales[Shop, Day]
    NEXT Shop

    IF DayTotal > BestTotal THEN
        BestTotal <- DayTotal
        BestDay   <- Day
    ENDIF
NEXT Day

OUTPUT "Best day was day ", BestDay, " with ", BestTotal`,
  ms:[{m:1,t:"Nested loops with the shop as the outer loop for the per-shop totals."},
      {m:1,t:"The running total reset inside the outer loop, once per shop."},
      {m:1,t:"Both indexes used correctly in the form Sales[Shop, Day]."},
      {m:1,t:"A second set of nested loops with the day as the outer loop."},
      {m:1,t:"Each day's total compared against a best so far, updating both values."},
      {m:1,t:"Inner loops closed before outer loops, with NEXT naming the right counters."}] },

/* ---------------- STRINGS ---------------- */
{ id:"I17", level:"igcse", topic:"Strings", paper:2, diff:2, marks:5, kind:"code",
  title:"Counting a letter",
  stem:`<p>A word and a single letter are input. Output how many times that letter appears in the word.</p>
        <p>The count must ignore case, so searching for <code>e</code> in <code>Engineer</code> gives <code>3</code>.</p>`,
  tips:[`To ignore case, convert both the word and the letter to the same case before comparing. Do it once, not inside the loop.`,
        `Walk the word one position at a time from 1 to its length, taking a single character each time.`,
        `<code>SUBSTRING(Word, i, 1)</code> takes one character at position i. The loop bound comes from <code>LENGTH(Word)</code>.`],
  run:{ inputs:"Engineer\ne" },
  model:
`DECLARE Word, Upper : STRING
DECLARE Letter, Target : CHAR
DECLARE i, Count : INTEGER

OUTPUT "Enter a word: "
INPUT Word
OUTPUT "Enter a letter: "
INPUT Letter

Upper  <- UCASE(Word)          // fold once, outside the loop
Target <- UCASE(Letter)
Count  <- 0

FOR i <- 1 TO LENGTH(Upper)
    IF SUBSTRING(Upper, i, 1) = Target THEN
        Count <- Count + 1
    ENDIF
NEXT i

OUTPUT Count`,
  ms:[{m:1,t:"Word and letter both input into correctly typed variables."},
      {m:1,t:"Counter initialised to zero before the loop."},
      {m:1,t:"The loop runs from 1 to LENGTH of the word."},
      {m:1,t:"SUBSTRING used with a length of 1 to extract each character."},
      {m:1,t:"Case folded with UCASE or LCASE on both sides before comparing."}] },

{ id:"I18", level:"igcse", topic:"Strings", paper:2, diff:3, marks:5, kind:"code",
  title:"Reversing a word",
  stem:`<p>A word is input. Output it backwards, then state whether the word reads the same in both directions.</p>`,
  tips:[`Build the answer into a new string that starts empty, joining one character at a time.`,
        `To reverse it, walk the original from its last position down to 1.`,
        `<code>FOR i &#8592; LENGTH(Word) TO 1 STEP -1</code>, and inside, <code>Result &#8592; Result & SUBSTRING(Word, i, 1)</code>. Then compare Result with the original.`],
  run:{ inputs:"level" },
  model:
`DECLARE Word, Result : STRING
DECLARE i : INTEGER

OUTPUT "Enter a word: "
INPUT Word

Result <- ""                     // start from empty

FOR i <- LENGTH(Word) TO 1 STEP -1
    Result <- Result & SUBSTRING(Word, i, 1)
NEXT i

OUTPUT Result

IF UCASE(Result) = UCASE(Word) THEN
    OUTPUT "It reads the same both ways"
ELSE
    OUTPUT "It does not"
ENDIF`,
  ms:[{m:1,t:"The result string initialised to empty before the loop."},
      {m:1,t:"A loop running backwards using STEP -1 from LENGTH to 1."},
      {m:1,t:"SUBSTRING used to take one character at a time."},
      {m:1,t:"The characters joined onto the result with &."},
      {m:1,t:"The reversed word compared with the original and a message output."}] },

{ id:"I19", level:"igcse", topic:"Strings", paper:2, diff:4, marks:6, kind:"code",
  title:"Checking a product code",
  stem:`<p>A product code must be exactly 6 characters: two capital letters followed by four digits, for example <code>AB1234</code>.</p>
        <p>A code is input. Output <code>Valid</code> or <code>Invalid</code>. You may assume a helper is not available &mdash; test the characters yourself.</p>`,
  tips:[`Three things must all be true: the length, the first two characters being letters, and the last four being digits. Check the length first - if it is wrong there is no point looking further.`,
        `A capital letter is one that lies between 'A' and 'Z'. A digit lies between '0' and '9'. Single characters can be compared with &lt; and &gt;.`,
        `Use a BOOLEAN flag that starts TRUE and is set to FALSE the moment anything fails. Loop positions 1 to 2 for the letters and 3 to 6 for the digits.`],
  run:{ inputs:"AB1234" },
  model:
`DECLARE Code : STRING
DECLARE Ch : CHAR
DECLARE i : INTEGER
DECLARE Valid : BOOLEAN

OUTPUT "Enter the product code: "
INPUT Code

Valid <- TRUE

IF LENGTH(Code) <> 6 THEN
    Valid <- FALSE
ELSE
    FOR i <- 1 TO 2                         // first two must be letters
        Ch <- SUBSTRING(Code, i, 1)
        IF Ch < 'A' OR Ch > 'Z' THEN
            Valid <- FALSE
        ENDIF
    NEXT i

    FOR i <- 3 TO 6                         // last four must be digits
        Ch <- SUBSTRING(Code, i, 1)
        IF Ch < '0' OR Ch > '9' THEN
            Valid <- FALSE
        ENDIF
    NEXT i
ENDIF

IF Valid THEN
    OUTPUT "Valid"
ELSE
    OUTPUT "Invalid"
ENDIF`,
  ms:[{m:1,t:"A Boolean flag initialised to TRUE before the checks."},
      {m:1,t:"The length checked against 6 first."},
      {m:1,t:"A loop over positions 1 to 2 testing for capital letters."},
      {m:1,t:"A loop over positions 3 to 6 testing for digits."},
      {m:1,t:"SUBSTRING used with a length of 1 to extract each character."},
      {m:1,t:"The flag decides a single Valid or Invalid output at the end."}] },

/* ---------------- SUBROUTINES ---------------- */
{ id:"I20", level:"igcse", topic:"Subroutines", paper:2, diff:2, marks:5, kind:"code",
  title:"A function for the larger value",
  stem:`<p>Write a function <code>Larger</code> that takes two INTEGER values and returns the larger of them.</p>
        <p>Then show two lines that use it.</p>`,
  tips:[`It must be a FUNCTION, not a procedure, because it gives a value back. Write the header and the ENDFUNCTION line first.`,
        `Inside, compare the two parameters and return whichever is bigger.`,
        `<code>FUNCTION Larger(A : INTEGER, B : INTEGER) RETURNS INTEGER</code>. A function is used inside an expression or an OUTPUT - it never takes CALL.`],
  model:
`FUNCTION Larger(A : INTEGER, B : INTEGER) RETURNS INTEGER
    IF A > B THEN
        RETURN A
    ELSE
        RETURN B
    ENDIF
ENDFUNCTION

OUTPUT Larger(3, 9)
OUTPUT Larger(41, 12)`,
  ms:[{m:1,t:"FUNCTION keyword with two correctly typed parameters."},
      {m:1,t:"RETURNS INTEGER on the header."},
      {m:1,t:"ENDFUNCTION closing the routine."},
      {m:1,t:"A comparison between the two parameters."},
      {m:1,t:"RETURN used on both paths, and the function used without CALL."}] },

{ id:"I21", level:"igcse", topic:"Subroutines", paper:2, diff:3, marks:6, kind:"code",
  title:"A procedure that draws",
  stem:`<p>Write a procedure <code>DrawBox</code> that takes a width and a height and outputs a rectangle of asterisks of that size.</p>
        <p>For a width of 4 and height of 3 it outputs three lines of <code>****</code>.</p>
        <p>Then call it twice with different sizes.</p>`,
  tips:[`It outputs rather than calculating a value, so it is a procedure. Procedures are invoked with CALL.`,
        `Build each line as a string before outputting it, using a loop that runs Width times.`,
        `Two nested loops: the outer runs Height times for the rows, the inner builds one row of Width asterisks. Reset the row string to "" at the start of each row.`],
  model:
`PROCEDURE DrawBox(Width : INTEGER, Height : INTEGER)
    DECLARE Row : STRING
    DECLARE r, c : INTEGER

    FOR r <- 1 TO Height
        Row <- ""                  // reset for each row
        FOR c <- 1 TO Width
            Row <- Row & "*"
        NEXT c
        OUTPUT Row
    NEXT r
ENDPROCEDURE

CALL DrawBox(4, 3)
CALL DrawBox(2, 2)`,
  ms:[{m:1,t:"PROCEDURE header with two typed parameters, closed with ENDPROCEDURE."},
      {m:1,t:"An outer loop running Height times."},
      {m:1,t:"An inner loop running Width times."},
      {m:1,t:"The row string reset to empty at the start of each row."},
      {m:1,t:"Characters joined with & and the row output once per row."},
      {m:1,t:"The procedure invoked with CALL and two arguments."}] },

/* ---------------- FILES ---------------- */
{ id:"I22", level:"igcse", topic:"Files", paper:2, diff:3, marks:6, kind:"code",
  title:"Counting lines in a file",
  stem:`<p>A text file <code>"Log.txt"</code> holds one message per line.</p>
        <p>Read the whole file and output every line, then the total number of lines. The file may be empty.</p>`,
  tips:[`Three steps always: open, use, close. The file is being read, so which mode?`,
        `"The file may be empty" rules out REPEAT - you need a loop that can run zero times, testing for the end before each read.`,
        `<code>WHILE NOT EOF("Log.txt") DO</code>. Close the file before you output the total.`],
  run:{ files:[{name:"Log.txt", lines:["system started","user logged in","file saved","user logged out"]}] },
  model:
`DECLARE Line : STRING
DECLARE Count : INTEGER

Count <- 0

OPENFILE "Log.txt" FOR READ

WHILE NOT EOF("Log.txt") DO
    READFILE "Log.txt", Line
    OUTPUT Line
    Count <- Count + 1
ENDWHILE

CLOSEFILE "Log.txt"

OUTPUT Count, " lines in the file"`,
  ms:[{m:1,t:"The file opened FOR READ."},
      {m:1,t:"A WHILE loop controlled by NOT EOF, so an empty file reads nothing."},
      {m:1,t:"READFILE used with the file name and a variable to receive the line."},
      {m:1,t:"Each line output inside the loop."},
      {m:1,t:"A counter initialised to zero and increased once per line."},
      {m:1,t:"The file closed, and the total output after the loop."}] },

{ id:"I23", level:"igcse", topic:"Files", paper:2, diff:4, marks:6, kind:"code",
  title:"Writing a register to a file",
  stem:`<p>Twenty pupil names are held in an array <code>Register</code> of <code>ARRAY[1:20] OF STRING</code>.</p>
        <p>Write them all to a file called <code>"Register.txt"</code>, one per line. Then read the file back and output only the names that begin with the letter <code>S</code>.</p>`,
  tips:[`This is two separate file operations. Finish the first completely - including closing the file - before starting the second.`,
        `Writing is a FOR loop over the array; reading back is a WHILE NOT EOF loop.`,
        `To test the first letter, take one character from position 1 with <code>SUBSTRING(Name, 1, 1)</code> and compare it with "S".`],
  run:{ setup:"DECLARE Register : ARRAY[1:20] OF STRING\nDECLARE Seed : INTEGER\nFOR Seed <- 1 TO 20\n    IF MOD(Seed, 4) = 0 THEN\n        Register[Seed] <- \"Sam\" & NUM_TO_STRING(Seed)\n    ELSE\n        Register[Seed] <- \"Alex\" & NUM_TO_STRING(Seed)\n    ENDIF\nNEXT Seed" },
  model:
`DECLARE i : INTEGER
DECLARE Line : STRING

OPENFILE "Register.txt" FOR WRITE       // write the whole register out

FOR i <- 1 TO 20
    WRITEFILE "Register.txt", Register[i]
NEXT i

CLOSEFILE "Register.txt"

OPENFILE "Register.txt" FOR READ        // now read it back

WHILE NOT EOF("Register.txt") DO
    READFILE "Register.txt", Line
    IF SUBSTRING(Line, 1, 1) = "S" THEN
        OUTPUT Line
    ENDIF
ENDWHILE

CLOSEFILE "Register.txt"`,
  ms:[{m:1,t:"The file opened FOR WRITE and closed after writing."},
      {m:1,t:"A FOR loop over the array writing every element."},
      {m:1,t:"WRITEFILE used with the file name and the value."},
      {m:1,t:"The file reopened FOR READ for the second pass."},
      {m:1,t:"A WHILE NOT EOF loop reading each line back."},
      {m:1,t:"The first character tested with SUBSTRING and only matching names output."}] },

/* ---------------- TRACING ---------------- */
{ id:"I24", level:"igcse", topic:"Tracing", paper:2, diff:2, marks:4, kind:"trace",
  title:"Trace a FOR loop",
  stem:`<p>Complete the trace table for this algorithm. Write a value in every cell.</p>`,
  stemCode:
`A <- 3
B <- 12

FOR C <- 1 TO 3
    A <- A + C
    B <- B - A
    OUTPUT A, " ", B
NEXT C`,
  cols:["C","A","B","OUTPUT"],
  rows:[["1","4","8","4 8"],["2","6","2","6 2"],["3","9","-7","9 -7"]],
  tips:[`One row per pass through the loop, not one row per line. The loop runs exactly three times.`,
        `Work strictly top to bottom inside each pass. B is reduced using the value A has <em>after</em> it was just changed on the line above.`,
        `Pass 1: A becomes 3 + 1 = 4, then B becomes 12 - 4 = 8. Carry those forward into pass 2 - do not go back to 3 and 12.`],
  ms:[{m:1,t:"Counter column shows 1, 2, 3."},
      {m:1,t:"Column A shows 4, 6, 9."},
      {m:1,t:"Column B shows 8, 2 and -7."},
      {m:1,t:"The output column matches the updated values in each row."}] },

{ id:"I25", level:"igcse", topic:"Tracing", paper:2, diff:3, marks:5, kind:"trace",
  title:"Trace a WHILE loop",
  stem:`<p>Complete the trace table, then state in one sentence what the algorithm calculates.</p>`,
  stemCode:
`N <- 40
Count <- 0

WHILE N > 1 DO
    N <- DIV(N, 2)
    Count <- Count + 1
    OUTPUT N, " ", Count
ENDWHILE`,
  cols:["N","Count","OUTPUT"],
  rows:[["20","1","20 1"],["10","2","10 2"],["5","3","5 3"],["2","4","2 4"],["1","5","1 5"]],
  tips:[`<code>DIV(N, 2)</code> halves N and throws away any fraction, so 5 becomes 2, not 2.5.`,
        `The condition is tested at the top, so the loop stops as soon as N is no longer greater than 1.`,
        `40, 20, 10, 5, 2, 1 - that is five halvings before N reaches 1.`],
  modelNote:`<p><strong>What it does:</strong> it counts how many times the starting number can be halved before it reaches 1.</p>`,
  ms:[{m:1,t:"Five rows used - the loop runs exactly five times."},
      {m:1,t:"Column N shows 20, 10, 5, 2, 1."},
      {m:1,t:"DIV(5, 2) is correctly given as 2, not 2.5."},
      {m:1,t:"The count reaches 5 and the output column matches."},
      {m:1,t:"The purpose is stated as counting the halvings."}] },

{ id:"I26", level:"igcse", topic:"Tracing", paper:2, diff:4, marks:6, kind:"trace",
  title:"Trace a nested loop",
  stem:`<p>Complete the trace table, using <strong>one row per pass of the inner loop</strong>. Leave the output cell empty when nothing is output on that pass.</p>`,
  stemCode:
`Total <- 0

FOR i <- 1 TO 3
    FOR j <- 1 TO i
        Total <- Total + j
    NEXT j
    OUTPUT Total
NEXT i`,
  cols:["i","j","Total","OUTPUT"],
  rows:[["1","1","1","1"],["2","1","2",""],["2","2","4","4"],["3","1","5",""],["3","2","7",""],["3","3","10","10"]],
  tips:[`The inner loop runs a different number of times for each i: once, then twice, then three times. That is six rows.`,
        `The OUTPUT happens after the inner loop finishes, so it only appears on the last inner pass for each value of i.`,
        `Total is never reset, so it keeps growing across the whole table: 1, 2, 4, 5, 7, 10.`],
  ms:[{m:1,t:"Six rows used in total."},
      {m:1,t:"Column i shows 1, 2, 2, 3, 3, 3."},
      {m:1,t:"Column j restarts at 1 for each new value of i."},
      {m:1,t:"Total accumulates without being reset, reaching 10."},
      {m:1,t:"Output appears only on the final inner pass for each i."},
      {m:1,t:"The output values are 1, 4 and 10."}] },

/* ---------------- DEBUGGING ---------------- */
{ id:"I27", level:"igcse", topic:"Debugging", paper:2, diff:3, marks:6, kind:"code",
  title:"Find and fix six errors",
  stem:`<p>This algorithm should input 5 numbers and output how many are greater than 20. It contains <strong>six</strong> errors.</p>
        <p>Rewrite it correctly.</p>`,
  stemCode:
`declare count : integer
DECLARE Number : INTEGER

count = 0

FOR i <- 1 TO 5
    INPUT "Enter a number", Number
    IF Number > 20
        count <- count + 1
NEXT j

OUTPUT count`,
  tips:[`Three of the errors are about how things are written: case, and the symbol used to store a value. Look at the first four lines.`,
        `Two errors are missing keywords. Every IF needs two things this one does not have.`,
        `The sixth is the loop: NEXT must name the same variable the FOR started with. Also, INPUT takes a variable and nothing else, so the prompt needs its own line.`],
  run:{ inputs:"12\n30\n45\n7\n21" },
  model:
`DECLARE Count : INTEGER          // 1. keywords and type in upper case
DECLARE Number : INTEGER
DECLARE i : INTEGER

Count <- 0                       // 2. assignment is an arrow, not =

FOR i <- 1 TO 5
    OUTPUT "Enter a number: "    // 3. INPUT cannot carry a prompt
    INPUT Number

    IF Number > 20 THEN          // 4. THEN was missing
        Count <- Count + 1
    ENDIF                        // 5. ENDIF was missing
NEXT i                           // 6. NEXT must name the FOR counter

OUTPUT Count`,
  ms:[{m:1,t:"Keywords and the data type written in upper case."},
      {m:1,t:"Assignment to the counter uses the arrow, not an equals sign."},
      {m:1,t:"The prompt moved out of INPUT onto its own OUTPUT line."},
      {m:1,t:"THEN added to the IF statement."},
      {m:1,t:"ENDIF added to close the selection."},
      {m:1,t:"NEXT changed to name the same counter as the FOR."}] },

/* ---------------- SYNTAX DRILLS ---------------- */
{ id:"J01", level:"igcse", topic:"Syntax drill", paper:2, diff:1, marks:1, kind:"mcq",
  title:"Assignment", stem:`<p>Which line correctly stores 25 in an INTEGER variable called <code>Total</code>?</p>`,
  options:[`Total = 25`,`Total <- 25`,`25 -> Total`,`SET Total TO 25`], correct:1,
  explain:`Assignment is always the left arrow with the variable on its left. <code>=</code> is only ever a comparison.`,
  tips:[`Two of these come from real programming languages, not from pseudocode.`,`Which symbol shows a value travelling into a variable?`,`The variable receiving the value goes on the left of an arrow.`] },

{ id:"J02", level:"igcse", topic:"Syntax drill", paper:2, diff:1, marks:1, kind:"mcq",
  title:"Substring", stem:`<p>What is the value of <code>SUBSTRING("COMPUTER", 4, 3)</code>?</p>`,
  options:[`"PUT"`,`"MPU"`,`"PUTE"`,`"UTE"`], correct:0,
  explain:`Counting from 1: C(1) O(2) M(3) P(4) U(5) T(6). Starting at 4 and taking 3 characters gives "PUT". The third argument is a length, not an end position.`,
  tips:[`Count the positions starting from 1, not 0.`,`The third argument says how many characters to take.`,`Position 4 is the letter P. Take three characters from there.`] },

{ id:"J03", level:"igcse", topic:"Syntax drill", paper:2, diff:1, marks:1, kind:"mcq",
  title:"Not equal to", stem:`<p>Which operator means "is not equal to"?</p>`,
  options:[`!=`,`<>`,`/=`,`NOT=`], correct:1,
  explain:`Pseudocode uses <code>&lt;&gt;</code>. The others belong to other languages and are not credited.`,
  tips:[`Three of these come from actual programming languages.`,`It is built from the less-than and greater-than symbols.`,`Think of it as "less than or greater than" - in other words, not equal.`] },

{ id:"J04", level:"igcse", topic:"Syntax drill", paper:2, diff:1, marks:1, kind:"mcq",
  title:"Closing a FOR loop", stem:`<p>A loop begins <code>FOR Row &#8592; 1 TO 8</code>. How must it end?</p>`,
  options:[`ENDFOR`,`NEXT Row`,`NEXT`,`LOOP Row`], correct:1,
  explain:`A FOR loop closes with <code>NEXT</code> followed by the <strong>same counter</strong>. There is no ENDFOR, and NEXT on its own is usually not credited.`,
  tips:[`It does not follow the "END + keyword" pattern that IF and WHILE use.`,`The closing line names something.`,`It names the counter variable from the FOR line.`] },

{ id:"J05", level:"igcse", topic:"Syntax drill", paper:2, diff:2, marks:1, kind:"mcq",
  title:"REPEAT runs at least once", stem:`<p>A <code>REPEAT ... UNTIL X > 10</code> loop is reached when X is already 50. How many times does the body run?</p>`,
  options:[`Zero times`,`Once`,`Forever`,`Ten times`], correct:1,
  explain:`REPEAT tests its condition <strong>after</strong> the body, so the body always runs at least once even when the condition is already true. A WHILE in the same situation would run zero times.`,
  tips:[`Where in the loop is the condition written?`,`The condition sits at the bottom, so something has already happened before it is tested.`,`REPEAT can never run zero times.`] },

{ id:"J06", level:"igcse", topic:"Syntax drill", paper:2, diff:1, marks:1, kind:"mcq",
  title:"MOD", stem:`<p>What is the value of <code>MOD(47, 5)</code>?</p>`,
  options:[`9`,`9.4`,`2`,`5`], correct:2,
  explain:`MOD gives the <strong>remainder</strong>. Five goes into 47 nine times making 45, leaving 2. <code>DIV(47, 5)</code> would give 9.`,
  tips:[`One of these is what DIV would give you, not MOD.`,`MOD is what is left over after the whole divisions.`,`Nine 5s make 45. How much of the 47 is left?`] },

{ id:"J07", level:"igcse", topic:"Syntax drill", paper:2, diff:2, marks:1, kind:"mcq",
  title:"Joining text", stem:`<p><code>First</code> holds <code>"Ada"</code> and <code>Last</code> holds <code>"Lovelace"</code>. Which line puts <code>"Ada Lovelace"</code> into <code>Full</code>?</p>`,
  options:[`Full <- First + " " + Last`,`Full <- First, " ", Last`,`Full <- First & " " & Last`,`Full <- JOIN(First, Last)`], correct:2,
  explain:`<code>&amp;</code> joins strings. <code>+</code> adds numbers, and commas only separate values inside an OUTPUT.`,
  tips:[`One of these would work inside an OUTPUT but not in an assignment.`,`There is a dedicated symbol for joining text.`,`It is the ampersand.`] },

{ id:"J08", level:"igcse", topic:"Syntax drill", paper:2, diff:2, marks:1, kind:"mcq",
  title:"Validation or verification", stem:`<p>A program asks the user to type their new password twice and checks the two entries match. What is this?</p>`,
  options:[`A range check`,`A format check`,`Verification by double entry`,`A presence check`], correct:2,
  explain:`Checking that data was entered correctly is <strong>verification</strong>, and typing it twice is double entry. Validation is about whether the data is <em>sensible</em>; verification is about whether it was <em>typed correctly</em>.`,
  tips:[`The three wrong answers are all types of one thing, and the question is describing the other thing.`,`Nothing here checks whether the password is sensible - only whether it was typed correctly.`,`That is verification, and the method has a name.`] },

{ id:"J09", level:"igcse", topic:"Syntax drill", paper:2, diff:2, marks:1, kind:"mcq",
  title:"Which loop", stem:`<p>An algorithm must read numbers until the user enters a negative value. Which loop is the best fit?</p>`,
  options:[`FOR, because numbers are being counted`,`A condition-controlled loop, because the number of entries is not known in advance`,`No loop is needed`,`FOR with STEP -1`], correct:1,
  explain:`You do not know how many numbers will be entered, so a counting loop cannot be used. It has to be WHILE or REPEAT, tested on the value entered.`,
  tips:[`Ask the key question: do you know how many repetitions before you start?`,`You cannot know how many numbers the user will type.`,`That rules out FOR entirely.`] },

{ id:"J10", level:"igcse", topic:"Syntax drill", paper:2, diff:2, marks:1, kind:"mcq",
  title:"Array bounds", stem:`<p><code>DECLARE Marks : ARRAY[1:30] OF INTEGER</code>. Which line would cause an error?</p>`,
  options:[`Marks[1] <- 50`,`Marks[30] <- 50`,`Marks[31] <- 50`,`Marks[15] <- 50`], correct:2,
  explain:`The array runs from 1 to 30, so 31 is outside it. Going one past the end is the most common array error there is - it usually comes from a loop that runs <code>1 TO 31</code>.`,
  tips:[`Read the bounds in the declaration carefully.`,`There are exactly 30 elements, numbered 1 to 30.`,`One of the four indexes is outside that range.`] }

];
