/* ============================================================================
   QUESTION BANK - original questions written in the style of each syllabus.
   No Cambridge past-paper material is reproduced.
   ========================================================================== */
"use strict";

/* Same file serves the browser and tools/verify.mjs under Node. */
var __g = (typeof window !== "undefined") ? window : globalThis;

__g.QUESTIONS_ALEVEL = [

/* ---------------- VARIABLES & OPERATORS ---------------- */
{
  id:"Q01", level:"as", topic:"Variables", paper:2, marks:4, kind:"code",
  title:"Declaring for a fitness tracker",
  stem:`<p>A fitness app stores, for one user: their name, their age in whole years, their resting heart rate as a whole number, their weight in kilograms to one decimal place, and whether they have completed today&rsquo;s goal.</p>
        <p>The app also uses a fixed step target of 10000 steps that never changes.</p>
        <p>Write the declarations, then set the weight to 68.4 and mark the goal as not yet completed.</p>`,
  tips:[
    `Five pieces of data means five variables &mdash; but the step target is not a variable. Which keyword do you use for a value that never changes?`,
    `Go through the list and name the type for each one. "To one decimal place" is a strong signal for REAL. "Whether or not" is always BOOLEAN.`,
    `The shape is <code>DECLARE Identifier : TYPE</code> for each, <code>CONSTANT Name = Value</code> for the fixed one, and then two assignment lines using the arrow. BOOLEAN values are written TRUE and FALSE with no quotes.`
  ],
  model:
`CONSTANT StepTarget = 10000

DECLARE UserName        : STRING
DECLARE Age             : INTEGER
DECLARE RestingHeart    : INTEGER
DECLARE Weight          : REAL
DECLARE GoalComplete    : BOOLEAN

Weight       <- 68.4
GoalComplete <- FALSE`,
  ms:[
    {m:1,t:"CONSTANT used for the step target, assigned with = and no data type."},
    {m:1,t:"STRING for the name and INTEGER for both age and resting heart rate."},
    {m:1,t:"REAL for weight and BOOLEAN for the goal flag."},
    {m:1,t:"Both assignments use the arrow, and FALSE is written without quotes."}
  ]
},
{
  id:"Q02", level:"as", topic:"Operators", paper:2, marks:5, kind:"code",
  title:"Seconds into hours, minutes and seconds",
  stem:`<p>A whole number of seconds is input. Output the equivalent time in hours, minutes and seconds.</p>
        <p>For example, an input of <code>3725</code> should produce <code>1 hour(s) 2 minute(s) 5 second(s)</code>.</p>
        <p>You must use the built-in functions rather than repeated subtraction.</p>`,
  tips:[
    `Two functions do all the work here. One gives you the whole-number part of a division, the other gives you what is left over.`,
    `Hours first: how many whole lots of 3600 are in the input? Then take the remainder after 3600 and repeat the same idea with 60.`,
    `<code>Hours &#8592; DIV(Total, 3600)</code>, then set a leftover variable to <code>MOD(Total, 3600)</code> and apply DIV and MOD by 60 to that leftover.`
  ],
  model:
`DECLARE TotalSecs : INTEGER
DECLARE Remainder : INTEGER
DECLARE Hours     : INTEGER
DECLARE Mins      : INTEGER
DECLARE Secs      : INTEGER

OUTPUT "Enter a number of seconds: "
INPUT TotalSecs

Hours     <- DIV(TotalSecs, 3600)      // whole hours
Remainder <- MOD(TotalSecs, 3600)      // what is left after the hours
Mins      <- DIV(Remainder, 60)
Secs      <- MOD(Remainder, 60)

OUTPUT Hours, " hour(s) ", Mins, " minute(s) ", Secs, " second(s)"`,
  ms:[
    {m:1,t:"Variables declared as INTEGER and a value input."},
    {m:1,t:"Hours found with DIV by 3600."},
    {m:1,t:"A remainder calculated with MOD by 3600."},
    {m:1,t:"Minutes and seconds correctly derived from that remainder using DIV and MOD by 60."},
    {m:1,t:"A single output producing all three values."}
  ]
},

/* ---------------- SELECTION ---------------- */
{
  id:"Q03", level:"as", topic:"Selection", paper:2, marks:6, kind:"code",
  title:"Parcel postage bands",
  stem:`<p>A courier charges by weight in kilograms:</p>
        <ul>
          <li>Up to and including 2 kg &mdash; 3.50</li>
          <li>Over 2 kg up to and including 10 kg &mdash; 6.75</li>
          <li>Over 10 kg up to and including 30 kg &mdash; 12.00</li>
          <li>Over 30 kg &mdash; refused</li>
        </ul>
        <p>A weight is input. Output the charge, or a message that the parcel is refused. A weight of zero or less is invalid and must produce a different message.</p>`,
  tips:[
    `Order your tests so that each one only needs a single comparison. If you have already ruled out "2 or less", you do not need to test the lower end of the next band.`,
    `Deal with the invalid case first &mdash; test for zero or less before any of the bands. Then work upwards through the bands.`,
    `Structure: <code>IF Weight &lt;= 0 THEN ... ELSE IF Weight &lt;= 2 THEN ... ELSE IF Weight &lt;= 10 THEN ...</code> and so on, each nested inside the previous ELSE, with an ENDIF for every IF. Watch "up to and including" &mdash; that is <code>&lt;=</code>, not <code>&lt;</code>.`
  ],
  model:
`DECLARE Weight : REAL
DECLARE Charge : REAL

OUTPUT "Enter parcel weight in kg: "
INPUT Weight

IF Weight <= 0 THEN
    OUTPUT "Invalid weight"
ELSE
    IF Weight <= 2 THEN                 // no need to test > 0 again
        Charge <- 3.50
        OUTPUT "Charge: ", Charge
    ELSE
        IF Weight <= 10 THEN
            Charge <- 6.75
            OUTPUT "Charge: ", Charge
        ELSE
            IF Weight <= 30 THEN
                Charge <- 12.00
                OUTPUT "Charge: ", Charge
            ELSE
                OUTPUT "Parcel refused - too heavy"
            ENDIF
        ENDIF
    ENDIF
ENDIF`,
  ms:[
    {m:1,t:"Weight declared as REAL and input."},
    {m:1,t:"Invalid weight (zero or less) tested and handled separately."},
    {m:1,t:"Correct boundary for the first band using <= 2."},
    {m:1,t:"Remaining bands tested in a sensible order with correct boundaries at 10 and 30."},
    {m:1,t:"Refusal message produced for anything over 30."},
    {m:1,t:"Every IF has a matching ENDIF and the blocks are indented."}
  ]
},
{
  id:"Q04", level:"as", topic:"Selection", paper:2, marks:5, kind:"code",
  title:"A menu with CASE",
  stem:`<p>A library system displays a menu and stores the user&rsquo;s choice in an INTEGER variable <code>Option</code>:</p>
        <ul>
          <li>1 &mdash; borrow a book, calling the procedure <code>BorrowBook</code></li>
          <li>2 &mdash; return a book, calling <code>ReturnBook</code></li>
          <li>3 &mdash; search the catalogue, calling <code>SearchCatalogue</code></li>
          <li>9 &mdash; quit, which outputs a closing message</li>
        </ul>
        <p>Write the selection statement. Any other number must produce an error message telling the user what is valid.</p>`,
  tips:[
    `You are comparing one variable against a list of specific values. That is exactly what one particular construct exists for &mdash; it is shorter than four nested IFs.`,
    `Do not forget the branch that catches everything you have not listed. It is worth a mark on its own and without it the algorithm does nothing at all on bad input.`,
    `The shape is <code>CASE OF Option</code>, then one line per value in the form <code>value : statement</code>, then <code>OTHERWISE : statement</code>, closed with <code>ENDCASE</code>. Procedures are invoked with CALL.`
  ],
  model:
`DECLARE Option : INTEGER

OUTPUT "Enter your choice: "
INPUT Option

CASE OF Option
    1        : CALL BorrowBook()
    2        : CALL ReturnBook()
    3        : CALL SearchCatalogue()
    9        : OUTPUT "Thank you for using the library system"
    OTHERWISE: OUTPUT "Invalid option - please enter 1, 2, 3 or 9"
ENDCASE`,
  ms:[
    {m:1,t:"CASE OF used with the correct variable, and closed with ENDCASE."},
    {m:1,t:"Options 1, 2 and 3 each call the named procedure using CALL."},
    {m:1,t:"Option 9 produces a closing message."},
    {m:1,t:"An OTHERWISE branch is present."},
    {m:1,t:"The error message states which options are valid, and colons separate each value from its statement."}
  ]
},

/* ---------------- ITERATION ---------------- */
{
  id:"Q05", level:"as", topic:"Iteration", paper:2, marks:4, kind:"code",
  title:"Counting down in steps",
  stem:`<p>Output every multiple of 5 from 100 down to 5 inclusive, one per line, then output how many numbers were printed.</p>`,
  tips:[
    `You know exactly how many repetitions are needed before you start, so this is the loop that counts.`,
    `You need to go downwards. There is a keyword that changes the size and direction of each step.`,
    `<code>FOR i &#8592; 100 TO 5 STEP -5</code> &hellip; <code>NEXT i</code>. Keep a separate counter variable, initialised to zero before the loop and increased inside it.`
  ],
  model:
`DECLARE i     : INTEGER
DECLARE Count : INTEGER

Count <- 0

FOR i <- 100 TO 5 STEP -5
    OUTPUT i
    Count <- Count + 1
NEXT i

OUTPUT Count, " numbers were printed"`,
  ms:[
    {m:1,t:"A FOR loop with the correct start and end values of 100 and 5."},
    {m:1,t:"STEP -5 used to count downwards."},
    {m:1,t:"NEXT names the same counter variable as the FOR."},
    {m:1,t:"A counter initialised to zero before the loop, increased inside it, and output after it."}
  ]
},
{
  id:"Q06", level:"as", topic:"Iteration", paper:2, marks:5, kind:"code",
  title:"Validating an input",
  stem:`<p>A program asks the user for an exam mark. The mark must be a whole number from 0 to 100 inclusive.</p>
        <p>Keep asking until a valid mark is entered, showing a helpful message each time the entry is rejected. Then output the accepted mark.</p>`,
  tips:[
    `You have to ask at least once before you can know whether the answer is valid. Which of the three loops guarantees the body runs at least once?`,
    `The loop stops when the condition becomes <em>true</em>, so the condition should describe a <em>valid</em> mark, not an invalid one.`,
    `<code>REPEAT</code> &hellip; <code>UNTIL Mark &gt;= 0 AND Mark &lt;= 100</code>. Put the prompt, the input and the error message all inside the loop, and the error message inside an IF so it only shows when the entry was actually rejected.`
  ],
  model:
`DECLARE Mark : INTEGER

REPEAT
    OUTPUT "Enter the mark (0 to 100): "
    INPUT Mark

    IF Mark < 0 OR Mark > 100 THEN
        OUTPUT "That is not valid. Marks run from 0 to 100."
    ENDIF
UNTIL Mark >= 0 AND Mark <= 100

OUTPUT "Mark accepted: ", Mark`,
  ms:[
    {m:1,t:"REPEAT ... UNTIL chosen, so the input is always requested at least once."},
    {m:1,t:"Prompt and INPUT both inside the loop."},
    {m:1,t:"Condition correctly describes a valid mark, using AND with inclusive boundaries."},
    {m:1,t:"An error message shown only when the entry is rejected."},
    {m:1,t:"The accepted mark output after the loop has finished."}
  ]
},
{
  id:"Q07", level:"as", topic:"Iteration", paper:2, marks:6, kind:"code",
  title:"Totalling until a sentinel",
  stem:`<p>A shop records the value of each sale. The operator enters values one at a time and enters <code>-1</code> to signal the end of the day.</p>
        <p>Output the total value of the sales, the number of sales, and the average sale value. The <code>-1</code> must not be counted or included in the total.</p>
        <p>Make sure your algorithm behaves sensibly if the very first entry is <code>-1</code>.</p>`,
  tips:[
    `You do not know how many sales there will be, so this is condition-controlled. The catch is that you must read a value before you can test whether it is the sentinel.`,
    `Read the first value <em>before</em> the loop, then test it. Inside the loop, process the value and then read the next one &mdash; so the input appears twice in your answer. This is called a priming read.`,
    `The last mark is the empty-day case: if no sales were made, <code>Total / Count</code> divides by zero. Guard the average with <code>IF Count &gt; 0 THEN</code>.`
  ],
  model:
`DECLARE Sale  : REAL
DECLARE Total : REAL
DECLARE Count : INTEGER

Total <- 0
Count <- 0

OUTPUT "Enter sale value (-1 to finish): "
INPUT Sale                              // priming read

WHILE Sale <> -1 DO
    Total <- Total + Sale
    Count <- Count + 1

    OUTPUT "Enter sale value (-1 to finish): "
    INPUT Sale                          // read the next one
ENDWHILE

OUTPUT "Number of sales: ", Count
OUTPUT "Total value: ", Total

IF Count > 0 THEN
    OUTPUT "Average sale: ", Total / Count
ELSE
    OUTPUT "No sales were recorded today"
ENDIF`,
  ms:[
    {m:1,t:"Total and Count both initialised to zero before the loop."},
    {m:1,t:"A priming read before the loop begins."},
    {m:1,t:"WHILE loop with a condition that stops on the sentinel value."},
    {m:1,t:"Total accumulated and count increased inside the loop."},
    {m:1,t:"A further input inside the loop, so the sentinel is excluded from the total."},
    {m:1,t:"Division guarded against a count of zero, with a sensible alternative message."}
  ]
},

/* ---------------- ARRAYS ---------------- */
{
  id:"Q08", level:"as", topic:"Arrays", paper:2, marks:5, kind:"code",
  title:"Average rainfall",
  stem:`<p>An array <code>Rainfall</code> is declared as <code>ARRAY[1:12] OF REAL</code> and already holds the monthly rainfall in millimetres for one year.</p>
        <p>Calculate and output the mean monthly rainfall, and the number of months that were above that mean.</p>`,
  tips:[
    `You cannot know which months are above the mean until you have the mean. That means two separate passes over the array.`,
    `First loop: add every element to a running total, then divide by 12. Second loop: compare each element against the mean you just calculated.`,
    `Both loops are <code>FOR i &#8592; 1 TO 12</code> &hellip; <code>NEXT i</code>. Initialise Total and Count to zero before their loops. Do not try to combine the two loops &mdash; the mean is not known during the first pass.`
  ],
  model:
`DECLARE Rainfall : ARRAY[1:12] OF REAL
DECLARE Total    : REAL
DECLARE Mean     : REAL
DECLARE Count    : INTEGER
DECLARE i        : INTEGER

Total <- 0
Count <- 0

// First pass: find the mean
FOR i <- 1 TO 12
    Total <- Total + Rainfall[i]
NEXT i

Mean <- Total / 12

// Second pass: count the months above it
FOR i <- 1 TO 12
    IF Rainfall[i] > Mean THEN
        Count <- Count + 1
    ENDIF
NEXT i

OUTPUT "Mean monthly rainfall: ", Mean
OUTPUT Count, " months were above the mean"`,
  ms:[
    {m:1,t:"Total initialised to zero before the first loop."},
    {m:1,t:"A FOR loop from 1 to 12 accumulating every element into the total."},
    {m:1,t:"Mean calculated by dividing by 12."},
    {m:1,t:"A second loop comparing each element against the mean."},
    {m:1,t:"A counter increased on each match and both results output after the loops."}
  ]
},
{
  id:"Q09", level:"as", topic:"Arrays", paper:2, marks:6, kind:"code",
  title:"Highest score and where it is",
  stem:`<p>An array <code>Scores</code> of <code>ARRAY[1:40] OF INTEGER</code> holds test scores, which may include negative values for absent students recorded as <code>-1</code>.</p>
        <p>Find and output the highest score and the position it is stored at. If the same highest score appears more than once, report the <strong>first</strong> position it occurs at.</p>`,
  tips:[
    `Do not start your "highest so far" at zero. Think about what happens if every value in the array is negative.`,
    `Assume the first element is the highest, record position 1, then compare every element from the second onwards against it.`,
    `To report the <em>first</em> occurrence, use a strictly greater-than test: <code>IF Scores[i] &gt; Highest THEN</code>. Using <code>&gt;=</code> would overwrite the position each time the value ties, giving you the last occurrence instead.`
  ],
  model:
`DECLARE Scores   : ARRAY[1:40] OF INTEGER
DECLARE Highest  : INTEGER
DECLARE Position : INTEGER
DECLARE i        : INTEGER

Highest  <- Scores[1]        // assume the first is best, never assume 0
Position <- 1

FOR i <- 2 TO 40             // start at 2, element 1 is already the benchmark
    IF Scores[i] > Highest THEN       // strictly > keeps the FIRST occurrence
        Highest  <- Scores[i]
        Position <- i
    ENDIF
NEXT i

OUTPUT "Highest score: ", Highest
OUTPUT "First found at position ", Position`,
  ms:[
    {m:1,t:"Highest initialised to the first element of the array, not to zero."},
    {m:1,t:"Position initialised to 1."},
    {m:1,t:"FOR loop covering the remaining elements with correct bounds."},
    {m:1,t:"Comparison uses strictly greater than, so the first occurrence is kept."},
    {m:1,t:"Both the value and the position updated together inside the IF."},
    {m:1,t:"Both results output after the loop finishes."}
  ]
},
{
  id:"Q10", level:"as", topic:"Arrays", paper:2, marks:6, kind:"code",
  title:"Linear search as a function",
  stem:`<p>A global array <code>Members</code> of <code>ARRAY[1:200] OF STRING</code> holds membership names in no particular order.</p>
        <p>Write a <strong>function</strong> <code>FindMember</code> that takes a name and returns the position it was found at, or <code>0</code> if the name is not in the array.</p>
        <p>The search must stop as soon as the name is found.</p>`,
  tips:[
    `It must be a FUNCTION, not a procedure, because it gives a value back. Write the header and the ENDFUNCTION line first, before any logic.`,
    `To stop early you need a loop whose condition can become false part-way through &mdash; a FOR loop cannot do that cleanly. Use a flag variable alongside the index.`,
    `<code>WHILE Index &lt;= 200 AND Found = FALSE DO</code>. Inside, if the element matches, set Found to TRUE; otherwise increase the index. Only increase the index in the ELSE, or you will return the position after the match.`
  ],
  model:
`FUNCTION FindMember(Target : STRING) RETURNS INTEGER
    DECLARE Index : INTEGER
    DECLARE Found : BOOLEAN

    Index <- 1
    Found <- FALSE

    WHILE Index <= 200 AND Found = FALSE DO
        IF Members[Index] = Target THEN
            Found <- TRUE
        ELSE
            Index <- Index + 1      // only move on if it did NOT match
        ENDIF
    ENDWHILE

    IF Found THEN
        RETURN Index
    ELSE
        RETURN 0
    ENDIF
ENDFUNCTION`,
  ms:[
    {m:1,t:"FUNCTION header with a STRING parameter and RETURNS INTEGER, closed with ENDFUNCTION."},
    {m:1,t:"Index and a Boolean flag both initialised before the loop."},
    {m:1,t:"Loop condition tests both the array bound and the flag, so the search stops early."},
    {m:1,t:"Array element compared against the parameter."},
    {m:1,t:"Index increased only when there is no match."},
    {m:1,t:"Returns the position when found and 0 when not found."}
  ]
},
{
  id:"Q11", level:"as", topic:"Arrays", paper:2, marks:6, kind:"code",
  title:"Bubble sort",
  stem:`<p>An array <code>Prices</code> of <code>ARRAY[1:50] OF REAL</code> holds unsorted values.</p>
        <p>Sort the array into <strong>descending</strong> order using a bubble sort.</p>`,
  tips:[
    `A bubble sort compares each element with the one next to it and swaps them if they are the wrong way round, repeating until everything is in order.`,
    `You need two nested loops: an outer one for the passes, an inner one that walks along the array comparing neighbours. After each pass, one more element at the end is already in its final place.`,
    `A swap always needs three lines and a temporary variable &mdash; you cannot do it in two, because the first assignment would destroy the value you still need. For <em>descending</em> order, swap when the earlier element is <em>smaller</em> than the later one.`
  ],
  model:
`DECLARE Prices : ARRAY[1:50] OF REAL
DECLARE Temp   : REAL
DECLARE Pass   : INTEGER
DECLARE i      : INTEGER

FOR Pass <- 1 TO 49
    FOR i <- 1 TO 50 - Pass            // the tail is already sorted
        IF Prices[i] < Prices[i + 1] THEN     // < gives DESCENDING order
            Temp           <- Prices[i]
            Prices[i]      <- Prices[i + 1]
            Prices[i + 1]  <- Temp
        ENDIF
    NEXT i
NEXT Pass`,
  ms:[
    {m:1,t:"An outer loop controlling the passes."},
    {m:1,t:"An inner loop comparing adjacent elements, with an upper bound that does not exceed the array."},
    {m:1,t:"Comparison between element i and element i+1."},
    {m:1,t:"The comparison is the correct way round for descending order."},
    {m:1,t:"A three-line swap using a temporary variable of the correct type."},
    {m:1,t:"Inner loop closed before the outer loop, with NEXT naming the right counters."}
  ]
},
{
  id:"Q12", level:"as", topic:"Arrays", paper:2, marks:6, kind:"code",
  title:"Totals from a two-dimensional array",
  stem:`<p>An array <code>Sales</code> declared as <code>ARRAY[1:5, 1:12] OF REAL</code> holds the sales figures for 5 shops across 12 months. The first index is the shop, the second is the month.</p>
        <p>Output the total annual sales for each shop, and then the single month number in which all shops combined sold the most.</p>`,
  tips:[
    `Two separate jobs. Totalling per shop means the shop index is the outer loop; finding the best month means the month index must be the outer loop.`,
    `For the per-shop totals, reset the running total to zero at the <em>start of each shop</em> &mdash; inside the outer loop, not before it. Forgetting this is the classic error here.`,
    `For the best month, total each month's column into a variable, then compare it against a "best so far". Initialise the best-so-far from month 1 rather than from zero.`
  ],
  model:
`DECLARE Sales      : ARRAY[1:5, 1:12] OF REAL
DECLARE ShopTotal  : REAL
DECLARE MonthTotal : REAL
DECLARE BestTotal  : REAL
DECLARE BestMonth  : INTEGER
DECLARE Shop, Month : INTEGER

// Annual total for each shop
FOR Shop <- 1 TO 5
    ShopTotal <- 0                     // reset INSIDE the outer loop
    FOR Month <- 1 TO 12
        ShopTotal <- ShopTotal + Sales[Shop, Month]
    NEXT Month
    OUTPUT "Shop ", Shop, " annual total: ", ShopTotal
NEXT Shop

// Best month across all shops
BestTotal <- -1
BestMonth <- 0

FOR Month <- 1 TO 12
    MonthTotal <- 0
    FOR Shop <- 1 TO 5
        MonthTotal <- MonthTotal + Sales[Shop, Month]
    NEXT Shop

    IF MonthTotal > BestTotal THEN
        BestTotal <- MonthTotal
        BestMonth <- Month
    ENDIF
NEXT Month

OUTPUT "Best month was month ", BestMonth, " with ", BestTotal`,
  ms:[
    {m:1,t:"Nested loops with the shop as the outer loop for the per-shop totals."},
    {m:1,t:"The running total reset to zero inside the outer loop, once per shop."},
    {m:1,t:"Both indexes used correctly in the form Sales[Shop, Month]."},
    {m:1,t:"A second set of nested loops with month as the outer loop."},
    {m:1,t:"Each month's total compared against a best-so-far, updating both the total and the month number."},
    {m:1,t:"Inner loops closed before outer loops throughout, with NEXT naming the correct counter."}
  ]
},

/* ---------------- STRINGS ---------------- */
{
  id:"Q13", level:"as", topic:"Strings", paper:2, marks:5, kind:"code",
  title:"Counting a character",
  stem:`<p>Write a function <code>CountChar</code> that takes a STRING and a CHAR and returns how many times that character appears in the string.</p>
        <p>The count must ignore case, so searching for <code>'e'</code> in <code>"Engineer"</code> returns <code>3</code>.</p>`,
  tips:[
    `To ignore case, convert both the string and the character you are looking for to the same case before comparing. Do it once, not inside the loop.`,
    `Walk the string one position at a time from 1 to its length, extracting a single character at each position.`,
    `<code>MID(Text, i, 1)</code> takes one character starting at position i. The loop bound comes from <code>LENGTH(Text)</code>. Compare against the folded search character and increase a counter that you initialised to zero.`
  ],
  model:
`FUNCTION CountChar(Text : STRING, Search : CHAR) RETURNS INTEGER
    DECLARE i      : INTEGER
    DECLARE Count  : INTEGER
    DECLARE Upper  : STRING
    DECLARE Target : CHAR

    Count  <- 0
    Upper  <- TO_UPPER(Text)          // fold once, outside the loop
    Target <- TO_UPPER(Search)

    FOR i <- 1 TO LENGTH(Upper)
        IF MID(Upper, i, 1) = Target THEN
            Count <- Count + 1
        ENDIF
    NEXT i

    RETURN Count
ENDFUNCTION`,
  ms:[
    {m:1,t:"FUNCTION header with both parameters typed and RETURNS INTEGER."},
    {m:1,t:"Counter initialised to zero before the loop."},
    {m:1,t:"Loop runs from 1 to LENGTH of the string."},
    {m:1,t:"MID used correctly with a length of 1 to extract each character."},
    {m:1,t:"Case folded with TO_UPPER or TO_LOWER on both sides, and the count returned."}
  ]
},
{
  id:"Q14", level:"as", topic:"Strings", paper:2, marks:6, kind:"code",
  title:"Palindrome check",
  stem:`<p>Write a function <code>IsPalindrome</code> that takes a STRING and returns TRUE if it reads the same forwards and backwards, ignoring case.</p>
        <p>You may assume the string contains no spaces or punctuation. An empty string counts as a palindrome.</p>`,
  tips:[
    `You do not need to build a reversed copy. Compare the first character with the last, the second with the second-to-last, and so on.`,
    `If the string has length L, then character i should match character <code>L - i + 1</code>. Check that formula on a short example before you rely on it.`,
    `You only need to check half the string. Loop from 1 to <code>DIV(LENGTH(Text), 2)</code>, and the moment a pair does not match you can return FALSE straight away. If the loop finishes, return TRUE.`
  ],
  model:
`FUNCTION IsPalindrome(Text : STRING) RETURNS BOOLEAN
    DECLARE i     : INTEGER
    DECLARE Len   : INTEGER
    DECLARE Upper : STRING

    Upper <- TO_UPPER(Text)
    Len   <- LENGTH(Upper)

    FOR i <- 1 TO DIV(Len, 2)              // only half needs checking
        IF MID(Upper, i, 1) <> MID(Upper, Len - i + 1, 1) THEN
            RETURN FALSE                   // one mismatch is enough
        ENDIF
    NEXT i

    RETURN TRUE                            // survived every comparison
ENDFUNCTION`,
  ms:[
    {m:1,t:"FUNCTION header with RETURNS BOOLEAN, closed with ENDFUNCTION."},
    {m:1,t:"String length obtained with LENGTH."},
    {m:1,t:"Case folded so the comparison ignores case."},
    {m:1,t:"Characters extracted from both ends using MID."},
    {m:1,t:"The mirrored index is correct, using LENGTH - i + 1."},
    {m:1,t:"Returns FALSE on a mismatch and TRUE only after all comparisons pass."}
  ]
},
{
  id:"Q15", level:"as", topic:"Strings", paper:2, marks:5, kind:"code",
  title:"Building initials",
  stem:`<p>A STRING <code>FullName</code> holds a person&rsquo;s name with single spaces between the parts, for example <code>"Ada Marie Lovelace"</code>.</p>
        <p>Output the initials in upper case separated by full stops, for example <code>A.M.L.</code></p>`,
  tips:[
    `The first character is always an initial. After that, any character that follows a space is an initial.`,
    `Walk the string from position 1. Take the character at position 1 automatically, then for every position after that, check whether the character <em>before</em> it is a space.`,
    `Build the answer into a STRING that starts as <code>""</code>, using <code>&amp;</code> to join each initial and a full stop onto it. Use <code>MID(FullName, i - 1, 1) = " "</code> to test the preceding character, and guard against i being 1.`
  ],
  model:
`DECLARE FullName : STRING
DECLARE Initials : STRING
DECLARE i        : INTEGER

Initials <- ""

FOR i <- 1 TO LENGTH(FullName)
    IF i = 1 OR MID(FullName, i - 1, 1) = " " THEN
        // this character starts a new part of the name
        Initials <- Initials & TO_UPPER(MID(FullName, i, 1)) & "."
    ENDIF
NEXT i

OUTPUT Initials`,
  ms:[
    {m:1,t:"Result string initialised to an empty string before the loop."},
    {m:1,t:"Loop from 1 to LENGTH of the name."},
    {m:1,t:"The first character is always treated as an initial."},
    {m:1,t:"A character following a space is identified as an initial."},
    {m:1,t:"Each initial converted to upper case and joined with & along with a full stop."}
  ]
},

/* ---------------- SUBROUTINES ---------------- */
{
  id:"Q16", level:"as", topic:"Subroutines", paper:2, marks:4, kind:"code",
  title:"Swapping two values",
  stem:`<p>Write a procedure <code>SwapValues</code> that exchanges the contents of two INTEGER variables belonging to the calling program.</p>
        <p>Then show the three lines that declare two variables, set them to 12 and 30, and call your procedure.</p>`,
  tips:[
    `For the caller's own variables to actually change, the parameters cannot be copies. Which passing mechanism do you need?`,
    `Exchanging two values needs a third variable to hold one of them temporarily. Two assignments alone will lose a value.`,
    `<code>PROCEDURE SwapValues(BYREF A : INTEGER, BYREF B : INTEGER)</code>. Inside: save A into Temp, copy B into A, then copy Temp into B. Invoke it with CALL.`
  ],
  model:
`PROCEDURE SwapValues(BYREF A : INTEGER, BYREF B : INTEGER)
    DECLARE Temp : INTEGER

    Temp <- A        // save A before it is overwritten
    A    <- B
    B    <- Temp
ENDPROCEDURE

DECLARE First, Second : INTEGER
First  <- 12
Second <- 30
CALL SwapValues(First, Second)       // First is now 30, Second is now 12`,
  ms:[
    {m:1,t:"PROCEDURE header with two parameters, closed with ENDPROCEDURE."},
    {m:1,t:"Both parameters passed BYREF."},
    {m:1,t:"A local temporary variable used, with the three assignments in a workable order."},
    {m:1,t:"The procedure invoked using CALL with two arguments."}
  ]
},
{
  id:"Q17", level:"as", topic:"Subroutines", paper:2, marks:5, kind:"code",
  title:"Largest of three",
  stem:`<p>Write a function <code>LargestOfThree</code> that takes three REAL values and returns the largest of them.</p>
        <p>Do not use an array, and do not call any other function.</p>`,
  tips:[
    `Take the first value as the largest so far, then test each of the other two against it in turn. That scales to any number of values and is what an examiner wants to see.`,
    `Two simple IF statements after the initial assignment are enough. You do not need ELSE branches or nesting.`,
    `<code>FUNCTION LargestOfThree(A : REAL, B : REAL, C : REAL) RETURNS REAL</code>. Set <code>Largest &#8592; A</code>, then <code>IF B &gt; Largest THEN Largest &#8592; B ENDIF</code>, likewise for C, then <code>RETURN Largest</code>.`
  ],
  model:
`FUNCTION LargestOfThree(A : REAL, B : REAL, C : REAL) RETURNS REAL
    DECLARE Largest : REAL

    Largest <- A                  // assume the first, then challenge it

    IF B > Largest THEN
        Largest <- B
    ENDIF

    IF C > Largest THEN
        Largest <- C
    ENDIF

    RETURN Largest
ENDFUNCTION`,
  ms:[
    {m:1,t:"FUNCTION keyword with three typed parameters."},
    {m:1,t:"RETURNS REAL on the header and ENDFUNCTION closing the routine."},
    {m:1,t:"A local variable initialised to the first parameter."},
    {m:1,t:"The other two parameters each compared against the largest so far."},
    {m:1,t:"RETURN used to send back the single result."}
  ]
},
{
  id:"Q18", level:"as", topic:"Subroutines", paper:2, marks:6, kind:"code",
  title:"BYVAL and BYREF together",
  stem:`<p>Write a procedure <code>ApplyTax</code> that:</p>
        <ul>
          <li>receives a net price and a tax rate as a percentage, neither of which it may alter for the caller</li>
          <li>sends back to the caller both the tax amount and the gross price</li>
        </ul>
        <p>Then show how the main program would call it for a net price of 240.00 at 15%.</p>`,
  tips:[
    `Four parameters in total. Two are inputs the procedure must not change; two are outputs it must change. That is exactly the BYVAL / BYREF distinction.`,
    `A procedure cannot RETURN a value &mdash; that is what functions do. A procedure sends results back by writing into its BYREF parameters.`,
    `Header: <code>PROCEDURE ApplyTax(BYVAL Net : REAL, BYVAL Rate : REAL, BYREF Tax : REAL, BYREF Gross : REAL)</code>. Inside, assign into Tax and Gross. The caller declares two variables and passes them as the last two arguments.`
  ],
  model:
`PROCEDURE ApplyTax(BYVAL Net : REAL, BYVAL Rate : REAL,
                   BYREF Tax : REAL, BYREF Gross : REAL)
    Tax   <- Net * Rate / 100
    Gross <- Net + Tax
ENDPROCEDURE

DECLARE TaxDue    : REAL
DECLARE FinalCost : REAL

CALL ApplyTax(240.00, 15.0, TaxDue, FinalCost)

OUTPUT "Tax: ", TaxDue           // 36.00
OUTPUT "Gross: ", FinalCost      // 276.00`,
  ms:[
    {m:1,t:"PROCEDURE header with four parameters, closed with ENDPROCEDURE."},
    {m:1,t:"The net price and rate both passed BYVAL."},
    {m:1,t:"The tax and gross both passed BYREF."},
    {m:1,t:"Tax calculated correctly as a percentage of the net price."},
    {m:1,t:"Gross calculated as net plus tax, assigned into the BYREF parameter."},
    {m:1,t:"Called with CALL, passing two variables for the results to be written into."}
  ]
},

/* ---------------- TRACING ---------------- */
{
  id:"Q19", level:"as", topic:"Tracing", paper:2, marks:4, kind:"trace",
  title:"Trace a FOR loop",
  stem:`<p>Complete the trace table for this algorithm. Write a value in every cell.</p>`,
  stemCode:
`A <- 2
B <- 5

FOR C <- 1 TO 3
    A <- A * B
    B <- B - 1
    OUTPUT A, " ", B
NEXT C`,
  cols:["C","A","B","OUTPUT"],
  rows:[
    ["1","10","4","10 4"],
    ["2","40","3","40 3"],
    ["3","120","2","120 2"]
  ],
  tips:[
    `One row per pass through the loop, not one row per line of code. The loop runs exactly three times.`,
    `Work strictly top to bottom within each pass. A is updated using the value B had at the <em>start</em> of that pass, before B is changed on the next line.`,
    `Pass 1: A becomes 2 &times; 5. Then B becomes 5 &minus; 1. Both new values are then output. Carry those new values forward into pass 2 &mdash; do not go back to 2 and 5.`
  ],
  ms:[
    {m:1,t:"Counter column shows 1, 2, 3."},
    {m:1,t:"Column A shows 10, 40, 120."},
    {m:1,t:"Column B shows 4, 3, 2."},
    {m:1,t:"Output column matches the updated values in each row."}
  ]
},
{
  id:"Q20", level:"as", topic:"Tracing", paper:2, marks:6, kind:"trace",
  title:"Trace a WHILE loop with DIV and MOD",
  stem:`<p>The variable <code>X</code> starts at <strong>472</strong>. Complete the trace table, then state in one sentence what the algorithm calculates.</p>`,
  stemCode:
`X <- 472
Y <- 0

WHILE X > 0 DO
    Y <- Y + MOD(X, 10)
    X <- DIV(X, 10)
    OUTPUT X, " ", Y
ENDWHILE`,
  cols:["X","Y","OUTPUT"],
  rows:[
    ["47","2","47 2"],
    ["4","9","4 9"],
    ["0","13","0 13"]
  ],
  tips:[
    `<code>MOD(X, 10)</code> gives the last digit of X. <code>DIV(X, 10)</code> chops that last digit off.`,
    `Y is updated <em>before</em> X changes, so the digit added in each row comes from the value X had at the start of that row.`,
    `Row 1: the last digit of 472 is 2, so Y becomes 2; X becomes 47. Row 2: last digit of 47 is 7, so Y becomes 9; X becomes 4. Keep going until X reaches 0 &mdash; the loop then stops because the condition is tested at the top.`
  ],
  modelNote:`<p><strong>What it does:</strong> it calculates the sum of the digits of the original number. 4 + 7 + 2 = 13.</p>`,
  ms:[
    {m:1,t:"Three rows used - the loop runs exactly three times."},
    {m:1,t:"Column X shows 47, 4, 0."},
    {m:1,t:"Column Y shows 2, 9, 13."},
    {m:1,t:"Output column matches X and Y in each row."},
    {m:1,t:"No fourth row: the loop stops once X is 0 because the condition is tested before the body."},
    {m:1,t:"Purpose correctly stated as finding the sum of the digits."}
  ]
},
{
  id:"Q21", level:"as", topic:"Tracing", paper:2, marks:6, kind:"trace",
  title:"Trace a nested loop",
  stem:`<p>Complete the trace table, using <strong>one row per pass of the inner loop</strong>. Leave a cell blank if nothing is output on that pass.</p>`,
  stemCode:
`Count <- 0

FOR i <- 1 TO 3
    FOR j <- 1 TO i
        Count <- Count + j
    NEXT j
    OUTPUT Count
NEXT i`,
  cols:["i","j","Count","OUTPUT"],
  rows:[
    ["1","1","1","1"],
    ["2","1","2",""],
    ["2","2","4","4"],
    ["3","1","5",""],
    ["3","2","7",""],
    ["3","3","10","10"]
  ],
  tips:[
    `The inner loop runs a different number of times for each value of i: once when i is 1, twice when i is 2, three times when i is 3. That is six rows in total.`,
    `The OUTPUT happens <em>after</em> the inner loop finishes, so it only appears on the last inner pass for each value of i.`,
    `Count is never reset, so it keeps growing across the whole table: 0 + 1 = 1, then + 1 = 2, + 2 = 4, then + 1 = 5, + 2 = 7, + 3 = 10.`
  ],
  ms:[
    {m:1,t:"Six rows used in total."},
    {m:1,t:"Column i shows 1, 2, 2, 3, 3, 3."},
    {m:1,t:"Column j restarts at 1 for each new value of i."},
    {m:1,t:"Count accumulates without being reset, reaching 10."},
    {m:1,t:"Output appears only on the final inner pass for each i."},
    {m:1,t:"Output values are 1, 4 and 10."}
  ]
},

/* ---------------- DEBUGGING ---------------- */
{
  id:"Q22", level:"as", topic:"Debugging", paper:2, marks:6, kind:"code",
  title:"Find and fix six errors",
  stem:`<p>This algorithm is meant to input 10 numbers and output how many of them are greater than 50. It contains <strong>six</strong> errors.</p>
        <p>Rewrite it correctly. Your answer should list or show all six corrections.</p>`,
  stemCode:
`declare Count : integer
DECLARE Number : INTEGER

Count = 0

FOR i <- 1 TO 10
    INPUT "Enter a number", Number
    IF Number > 50
        Count <- Count + 1
NEXT j

OUTPUT Count`,
  tips:[
    `Three of the errors are about how things are written &mdash; case, and the symbol used for assignment. Look at the first four lines.`,
    `Two errors are missing keywords. Every IF needs two things the original does not have.`,
    `The sixth is in the loop: <code>NEXT</code> must name the same variable the FOR started. Also check the INPUT statement &mdash; INPUT takes a variable and nothing else, so the prompt has to move to its own line.`
  ],
  model:
`DECLARE Count  : INTEGER          // 1. keywords and type in upper case
DECLARE Number : INTEGER
DECLARE i      : INTEGER

Count <- 0                        // 2. assignment is an arrow, not =

FOR i <- 1 TO 10
    OUTPUT "Enter a number: "     // 3. INPUT cannot carry a prompt
    INPUT Number

    IF Number > 50 THEN           // 4. THEN was missing
        Count <- Count + 1
    ENDIF                         // 5. ENDIF was missing
NEXT i                            // 6. NEXT must name the FOR counter

OUTPUT Count`,
  ms:[
    {m:1,t:"Keywords and data type written in upper case on the declaration."},
    {m:1,t:"Assignment to Count uses the arrow, not an equals sign."},
    {m:1,t:"The prompt moved out of INPUT onto its own OUTPUT line."},
    {m:1,t:"THEN added to the IF statement."},
    {m:1,t:"ENDIF added to close the selection."},
    {m:1,t:"NEXT changed to name i, matching the FOR."}
  ]
},

/* ---------------- FILES ---------------- */
{
  id:"Q23", level:"as", topic:"Files", paper:2, marks:6, kind:"code",
  title:"Counting matching lines in a file",
  stem:`<p>A text file <code>"Log.txt"</code> holds one message per line. Some messages begin with the five characters <code>ERROR</code>.</p>
        <p>Read the whole file and output how many messages are errors and how many lines the file holds in total. The file may be empty.</p>`,
  tips:[
    `Three steps always: open, use, close. The file is being read, so which mode?`,
    `"The file may be empty" rules out REPEAT &mdash; you need a loop that can run zero times, testing the end-of-file condition before each read.`,
    `<code>WHILE NOT EOF("Log.txt") DO</code>. To test the start of a line, <code>LEFT(Line, 5) = "ERROR"</code> is the neat way. Close the file before you output anything.`
  ],
  model:
`DECLARE Line       : STRING
DECLARE TotalLines : INTEGER
DECLARE ErrorCount : INTEGER

TotalLines <- 0
ErrorCount <- 0

OPENFILE "Log.txt" FOR READ

WHILE NOT EOF("Log.txt") DO
    READFILE "Log.txt", Line
    TotalLines <- TotalLines + 1

    IF LEFT(Line, 5) = "ERROR" THEN
        ErrorCount <- ErrorCount + 1
    ENDIF
ENDWHILE

CLOSEFILE "Log.txt"

OUTPUT TotalLines, " messages, of which ", ErrorCount, " were errors"`,
  ms:[
    {m:1,t:"File opened FOR READ."},
    {m:1,t:"A WHILE loop controlled by NOT EOF, so an empty file reads nothing."},
    {m:1,t:"READFILE used with the file name and a variable to receive the line."},
    {m:1,t:"Both counters initialised to zero before the loop and increased inside it."},
    {m:1,t:"LEFT used correctly to test the first five characters."},
    {m:1,t:"File closed, and results output after the loop."}
  ]
},
{
  id:"Q24", level:"as", topic:"Files", paper:2, marks:6, kind:"code",
  title:"Adding a record without losing the file",
  stem:`<p>A file <code>"Members.txt"</code> holds one member name per line.</p>
        <p>Write an algorithm that inputs a new name, checks it is not already in the file, and adds it if it is new. Output a suitable message either way.</p>
        <p>Existing members must not be lost.</p>`,
  tips:[
    `This is two file operations, one after the other: a search pass, then possibly a write. You cannot do both with the file open in the same mode.`,
    `Open FOR READ to search and close it. Only then decide whether to open it again for adding &mdash; and there is one mode that adds to the end rather than wiping the file.`,
    `Use a BOOLEAN flag set during the search. Search loop: <code>WHILE NOT EOF(...) AND Found = FALSE DO</code>. If the flag is still FALSE afterwards, <code>OPENFILE "Members.txt" FOR APPEND</code> and WRITEFILE the new name.`
  ],
  model:
`DECLARE NewName : STRING
DECLARE Line    : STRING
DECLARE Found   : BOOLEAN

Found <- FALSE

OUTPUT "Enter the new member name: "
INPUT NewName

// Pass 1 - search for a duplicate
OPENFILE "Members.txt" FOR READ

WHILE NOT EOF("Members.txt") AND Found = FALSE DO
    READFILE "Members.txt", Line
    IF Line = NewName THEN
        Found <- TRUE
    ENDIF
ENDWHILE

CLOSEFILE "Members.txt"

// Pass 2 - add only if it is genuinely new
IF Found THEN
    OUTPUT NewName, " is already a member"
ELSE
    OPENFILE "Members.txt" FOR APPEND     // APPEND, never WRITE
    WRITEFILE "Members.txt", NewName
    CLOSEFILE "Members.txt"
    OUTPUT NewName, " has been added"
ENDIF`,
  ms:[
    {m:1,t:"File opened FOR READ and closed after the search."},
    {m:1,t:"A NOT EOF loop that also stops early once a match is found."},
    {m:1,t:"A Boolean flag initialised to FALSE and set when the name matches."},
    {m:1,t:"The file reopened FOR APPEND, not FOR WRITE, so existing names survive."},
    {m:1,t:"WRITEFILE used with the file name and the new value, and the file closed again."},
    {m:1,t:"Different messages output for the duplicate and the added cases."}
  ]
},

/* ---------------- RECORDS ---------------- */
{
  id:"Q25", level:"a2", topic:"Records", paper:4, marks:5, kind:"code",
  title:"Defining a record type",
  stem:`<p>A cinema stores, for each booking: a booking reference of exactly 8 characters, the customer name, the film title, the number of seats, the total price, and whether the booking has been paid for.</p>
        <p>Define a suitable record type, declare an array able to hold 1000 bookings, and store a first booking in it.</p>`,
  tips:[
    `A record groups fields of <em>different</em> types under one name. Define the shape once, then declare variables of that new type.`,
    `The definition goes between TYPE and ENDTYPE, and each field is declared exactly as an ordinary variable would be.`,
    `Once the type exists you can use it like any other type: <code>DECLARE Bookings : ARRAY[1:1000] OF Booking</code>. Fields are reached with a dot, after the index: <code>Bookings[1].SeatCount &#8592; 4</code>.`
  ],
  model:
`TYPE Booking
    DECLARE BookingRef   : STRING
    DECLARE CustomerName : STRING
    DECLARE FilmTitle    : STRING
    DECLARE SeatCount    : INTEGER
    DECLARE TotalPrice   : REAL
    DECLARE Paid         : BOOLEAN
ENDTYPE

DECLARE Bookings : ARRAY[1:1000] OF Booking

Bookings[1].BookingRef   <- "CN480291"
Bookings[1].CustomerName <- "Ravi Deshmukh"
Bookings[1].FilmTitle    <- "The Third Man"
Bookings[1].SeatCount    <- 4
Bookings[1].TotalPrice   <- 38.00
Bookings[1].Paid         <- FALSE`,
  ms:[
    {m:1,t:"TYPE used with a name, closed with ENDTYPE."},
    {m:1,t:"All six fields declared inside the type definition."},
    {m:1,t:"Each field given an appropriate data type, with INTEGER for seats and REAL for price."},
    {m:1,t:"An array of 1000 elements declared OF the new record type."},
    {m:1,t:"Fields assigned using index-then-dot notation with values of the right types."}
  ]
},
{
  id:"Q26", level:"a2", topic:"Records", paper:4, marks:6, kind:"code",
  title:"Processing an array of records",
  stem:`<p>Using the <code>Booking</code> record and the <code>Bookings</code> array from the previous question, and given that <code>BookingCount</code> holds how many bookings are actually stored:</p>
        <p>Output the total value of all <strong>unpaid</strong> bookings, and the booking reference of the booking with the most seats.</p>`,
  tips:[
    `Loop only as far as BookingCount, not to 1000 &mdash; the rest of the array is empty and would corrupt your totals.`,
    `Two things are being tracked at once: a running total that is only added to conditionally, and a largest-so-far that needs its reference remembered alongside it.`,
    `Initialise the seat maximum from the first real booking, not from zero, and record <code>Bookings[1].BookingRef</code> alongside it. Then loop from 2 to BookingCount.`
  ],
  model:
`DECLARE UnpaidTotal : REAL
DECLARE MostSeats   : INTEGER
DECLARE BestRef     : STRING
DECLARE i           : INTEGER

UnpaidTotal <- 0
MostSeats   <- Bookings[1].SeatCount
BestRef     <- Bookings[1].BookingRef

IF Bookings[1].Paid = FALSE THEN
    UnpaidTotal <- Bookings[1].TotalPrice
ENDIF

FOR i <- 2 TO BookingCount           // stop at the real data, not at 1000
    IF Bookings[i].Paid = FALSE THEN
        UnpaidTotal <- UnpaidTotal + Bookings[i].TotalPrice
    ENDIF

    IF Bookings[i].SeatCount > MostSeats THEN
        MostSeats <- Bookings[i].SeatCount
        BestRef   <- Bookings[i].BookingRef
    ENDIF
NEXT i

OUTPUT "Outstanding payments total ", UnpaidTotal
OUTPUT "Largest booking is ", BestRef, " with ", MostSeats, " seats"`,
  ms:[
    {m:1,t:"Loop bounded by BookingCount rather than the array size."},
    {m:1,t:"Running total initialised to zero before the loop."},
    {m:1,t:"Price added only when the Paid field is FALSE."},
    {m:1,t:"Seat maximum initialised from the first booking rather than zero."},
    {m:1,t:"Booking reference updated at the same time as the seat maximum."},
    {m:1,t:"Correct dot notation used on the indexed array throughout, and both results output after the loop."}
  ]
},

/* ---------------- OOP ---------------- */
{
  id:"Q27", level:"a2", topic:"OOP", paper:4, marks:8, kind:"code",
  title:"A class with encapsulation",
  stem:`<p>Write a class <code>Thermostat</code> with:</p>
        <ul>
          <li>private attributes for the room name, the current target temperature, and whether the heating is on</li>
          <li>a constructor taking the room name and an initial target</li>
          <li>a method to change the target, which refuses any value outside 5 to 30 degrees</li>
          <li>a method returning the current target</li>
          <li>a method returning TRUE if the heating should run, given a measured room temperature passed in</li>
        </ul>`,
  tips:[
    `Attributes are always PRIVATE and methods that the outside world uses are PUBLIC. The constructor is always a procedure called NEW.`,
    `Decide for each method: does it give a value back? If yes it is a FUNCTION with RETURNS; if it just does something, it is a PROCEDURE.`,
    `The validation belongs <em>inside</em> the setter &mdash; that is the whole point of making the attribute private. The heating decision is a comparison: the heating should run when the measured temperature is below the target.`
  ],
  model:
`CLASS Thermostat
    PRIVATE RoomName   : STRING
    PRIVATE TargetTemp : REAL
    PRIVATE HeatingOn  : BOOLEAN

    PUBLIC PROCEDURE NEW(Room : STRING, InitialTarget : REAL)
        RoomName   <- Room
        TargetTemp <- InitialTarget
        HeatingOn  <- FALSE
    ENDPROCEDURE

    // Setter -- validates, because the attribute is private and this
    // is the only way in
    PUBLIC PROCEDURE SetTarget(NewTarget : REAL)
        IF NewTarget >= 5 AND NewTarget <= 30 THEN
            TargetTemp <- NewTarget
        ELSE
            OUTPUT "Target must be between 5 and 30 degrees"
        ENDIF
    ENDPROCEDURE

    // Getter
    PUBLIC FUNCTION GetTarget() RETURNS REAL
        RETURN TargetTemp
    ENDFUNCTION

    PUBLIC FUNCTION ShouldHeat(Measured : REAL) RETURNS BOOLEAN
        IF Measured < TargetTemp THEN
            HeatingOn <- TRUE
        ELSE
            HeatingOn <- FALSE
        ENDIF
        RETURN HeatingOn
    ENDFUNCTION
ENDCLASS

DECLARE Hallway : Thermostat
Hallway <- NEW Thermostat("Hallway", 19.5)
CALL Hallway.SetTarget(21.0)
OUTPUT Hallway.GetTarget()`,
  ms:[
    {m:1,t:"CLASS with a name, closed with ENDCLASS."},
    {m:1,t:"All three attributes declared PRIVATE with appropriate types."},
    {m:1,t:"A constructor named NEW, declared PUBLIC, taking two parameters."},
    {m:1,t:"The constructor assigns the parameters to the attributes."},
    {m:1,t:"SetTarget is a PUBLIC PROCEDURE that validates the range before assigning."},
    {m:1,t:"GetTarget is a PUBLIC FUNCTION with RETURNS REAL that returns the attribute."},
    {m:1,t:"ShouldHeat is a FUNCTION with RETURNS BOOLEAN comparing the parameter to the target."},
    {m:1,t:"An object created with NEW, and methods invoked correctly - CALL for the procedure, no CALL for the functions."}
  ]
},
{
  id:"Q28", level:"a2", topic:"OOP", paper:4, marks:6, kind:"code",
  title:"Inheritance and SUPER",
  stem:`<p>A class <code>Employee</code> already exists with private attributes <code>Name</code> and <code>AnnualSalary</code>, a constructor <code>NEW(N : STRING, S : REAL)</code>, and a public function <code>GetSalary() RETURNS REAL</code>.</p>
        <p>Write a subclass <code>Manager</code> that adds a bonus percentage, and provides a function <code>GetTotalPay</code> returning the salary plus the bonus.</p>
        <p>The subclass must not access <code>AnnualSalary</code> directly.</p>`,
  tips:[
    `The keyword that links a subclass to its parent goes on the CLASS line itself.`,
    `The subclass constructor must set up the parent's part before its own. There is a keyword for reaching the parent's version of a method.`,
    `<code>CLASS Manager INHERITS Employee</code>. In NEW, call <code>CALL SUPER.NEW(N, S)</code> first, then assign the bonus. In GetTotalPay, reach the salary through the inherited public <code>GetSalary()</code> &mdash; that is exactly why the getter exists.`
  ],
  model:
`CLASS Manager INHERITS Employee
    PRIVATE BonusPercent : REAL

    PUBLIC PROCEDURE NEW(N : STRING, S : REAL, Bonus : REAL)
        CALL SUPER.NEW(N, S)          // let the parent set up its own part
        BonusPercent <- Bonus
    ENDPROCEDURE

    PUBLIC FUNCTION GetTotalPay() RETURNS REAL
        DECLARE Base : REAL

        Base <- GetSalary()           // inherited public method, not the
                                      // private attribute
        RETURN Base + (Base * BonusPercent / 100)
    ENDFUNCTION
ENDCLASS

DECLARE Head : Manager
Head <- NEW Manager("Sofia Aldana", 52000.00, 12.5)
OUTPUT Head.GetTotalPay()             // 58500.00`,
  ms:[
    {m:1,t:"CLASS ... INHERITS ... used correctly on the class header, closed with ENDCLASS."},
    {m:1,t:"The additional attribute declared PRIVATE."},
    {m:1,t:"A constructor taking all three parameters."},
    {m:1,t:"SUPER.NEW called to initialise the inherited attributes."},
    {m:1,t:"GetTotalPay declared as a PUBLIC FUNCTION with RETURNS REAL."},
    {m:1,t:"The salary obtained through the inherited getter rather than the private attribute."}
  ]
},

/* ---------------- FURTHER ALGORITHMS ---------------- */
{
  id:"Q29", level:"a2", topic:"Algorithms", paper:4, marks:5, kind:"code",
  title:"Recursion",
  stem:`<p>Write a recursive function <code>Power</code> that takes a REAL base and a non-negative INTEGER exponent and returns the base raised to that exponent.</p>
        <p>Do not use the <code>^</code> operator or any loop.</p>
        <p>State clearly which part is the base case.</p>`,
  tips:[
    `Every recursive function needs two things: a case that returns an answer directly without recursing, and a case that calls itself with a <em>smaller</em> problem.`,
    `Anything raised to the power 0 is 1. That is your stopping condition.`,
    `Otherwise, base to the power n is base multiplied by (base to the power n&minus;1). Reducing the exponent by one each time guarantees you eventually reach 0.`
  ],
  model:
`FUNCTION Power(Base : REAL, Exponent : INTEGER) RETURNS REAL
    IF Exponent = 0 THEN
        RETURN 1                              // BASE CASE - stops the
                                              // recursion
    ELSE
        RETURN Base * Power(Base, Exponent - 1)   // general case, smaller
                                                  // each time
    ENDIF
ENDFUNCTION

OUTPUT Power(2.0, 5)          // 32.0`,
  ms:[
    {m:1,t:"FUNCTION header with both parameters typed and RETURNS REAL."},
    {m:1,t:"A base case testing for an exponent of 0."},
    {m:1,t:"The base case returns 1 without calling the function again."},
    {m:1,t:"The general case returns the base multiplied by a recursive call."},
    {m:1,t:"The recursive call reduces the exponent by 1, guaranteeing termination."}
  ]
},
{
  id:"Q30", level:"a2", topic:"Algorithms", paper:4, marks:7, kind:"code",
  title:"Stack push and pop",
  stem:`<p>A stack is held in a global array <code>StackData</code> of <code>ARRAY[1:100] OF INTEGER</code> with a global INTEGER <code>TopPointer</code>, which is 0 when the stack is empty.</p>
        <p>Write a procedure <code>Push</code> that adds a value, reporting an error if the stack is full, and a function <code>Pop</code> that removes and returns the top value, returning <code>-1</code> if the stack is empty.</p>`,
  tips:[
    `A stack is last-in, first-out. The pointer always indicates the position of the item currently on top.`,
    `Push: check for overflow <em>first</em>, then move the pointer up, then store. Pop: check for underflow first, then take the value, then move the pointer down.`,
    `The order matters. On Push you increase the pointer before storing, so the new item lands in a free slot. On Pop you read the value at the current pointer <em>before</em> decreasing it. Full means <code>TopPointer = 100</code>; empty means <code>TopPointer = 0</code>.`
  ],
  model:
`PROCEDURE Push(Value : INTEGER)
    IF TopPointer >= 100 THEN
        OUTPUT "Stack overflow - cannot push"     // check BEFORE writing
    ELSE
        TopPointer <- TopPointer + 1              // move up, then store
        StackData[TopPointer] <- Value
    ENDIF
ENDPROCEDURE


FUNCTION Pop() RETURNS INTEGER
    DECLARE Value : INTEGER

    IF TopPointer = 0 THEN
        OUTPUT "Stack underflow - nothing to pop"
        RETURN -1
    ELSE
        Value <- StackData[TopPointer]            // read, THEN move down
        TopPointer <- TopPointer - 1
        RETURN Value
    ENDIF
ENDFUNCTION`,
  ms:[
    {m:1,t:"Push is a PROCEDURE with a typed parameter; Pop is a FUNCTION with RETURNS INTEGER."},
    {m:1,t:"Push tests for a full stack before storing anything."},
    {m:1,t:"Push increases the pointer and then stores at that position."},
    {m:1,t:"Pop tests for an empty stack before reading."},
    {m:1,t:"Pop reads the value at the current pointer before decreasing it."},
    {m:1,t:"Pop returns -1 in the empty case."},
    {m:1,t:"Both routines correctly closed with ENDPROCEDURE and ENDFUNCTION."}
  ]
},
{
  id:"Q31", level:"a2", topic:"Algorithms", paper:4, marks:7, kind:"code",
  title:"Binary search",
  stem:`<p>An array <code>Sorted</code> of <code>ARRAY[1:1000] OF INTEGER</code> is already in ascending order.</p>
        <p>Write a function <code>BinarySearch</code> that returns the position of a value, or <code>0</code> if it is not present.</p>
        <p>Explain in a comment why this is faster than a linear search on this array.</p>`,
  tips:[
    `Keep two markers, one at each end of the region still worth searching. Look at the middle of that region and throw away the half that cannot contain the value.`,
    `The middle position is <code>DIV(Low + High, 2)</code> &mdash; you need whole-number division because it is an array index.`,
    `If the middle value is too small, the answer must be above it, so <code>Low &#8592; Mid + 1</code>. If too large, <code>High &#8592; Mid - 1</code>. The <strong>+1 and -1 matter</strong> &mdash; without them the loop never ends. Stop when Low passes High or the value is found.`
  ],
  model:
`FUNCTION BinarySearch(Target : INTEGER) RETURNS INTEGER
    DECLARE Low   : INTEGER
    DECLARE High  : INTEGER
    DECLARE Mid   : INTEGER
    DECLARE Found : BOOLEAN

    Low   <- 1
    High  <- 1000
    Found <- FALSE

    WHILE Low <= High AND Found = FALSE DO
        Mid <- DIV(Low + High, 2)          // whole-number division

        IF Sorted[Mid] = Target THEN
            Found <- TRUE
        ELSE
            IF Sorted[Mid] < Target THEN
                Low <- Mid + 1             // discard the lower half
            ELSE
                High <- Mid - 1            // discard the upper half
            ENDIF
        ENDIF
    ENDWHILE

    // Each pass halves the region still to search, so 1000 items need at
    // most 10 comparisons instead of up to 1000 for a linear search.
    IF Found THEN
        RETURN Mid
    ELSE
        RETURN 0
    ENDIF
ENDFUNCTION`,
  ms:[
    {m:1,t:"FUNCTION header with RETURNS INTEGER, closed with ENDFUNCTION."},
    {m:1,t:"Low and High initialised to the array bounds."},
    {m:1,t:"Loop continues while Low <= High and the value has not been found."},
    {m:1,t:"Midpoint calculated with whole-number division."},
    {m:1,t:"Low set to Mid + 1 when the middle value is too small."},
    {m:1,t:"High set to Mid - 1 when the middle value is too large."},
    {m:1,t:"Returns the position when found and 0 otherwise, with a comment explaining the halving."}
  ]
},
{
  id:"Q32", level:"a2", topic:"Algorithms", paper:4, marks:6, kind:"code",
  title:"Traversing a linked list",
  stem:`<p>A linked list is held in <code>Nodes</code>, an <code>ARRAY[1:200] OF TNode</code>, where <code>TNode</code> has fields <code>Data : INTEGER</code> and <code>Pointer : INTEGER</code>. A pointer value of <code>0</code> marks the end of the list. The INTEGER <code>StartPointer</code> gives the index of the first node, or 0 if the list is empty.</p>
        <p>Output every value in the list in order, and the number of nodes visited.</p>`,
  tips:[
    `You do not walk a linked list with a FOR loop &mdash; the nodes are not in array order. You follow the pointers.`,
    `Keep a variable holding "the node I am currently at". Start it at StartPointer, and at the end of each step move it on to the pointer field of the node you just visited.`,
    `<code>WHILE CurrentPointer &lt;&gt; 0 DO</code> handles an empty list too, since StartPointer would already be 0. Inside: output <code>Nodes[CurrentPointer].Data</code>, then <code>CurrentPointer &#8592; Nodes[CurrentPointer].Pointer</code>. Getting those two lines the wrong way round loses the first value.`
  ],
  model:
`DECLARE CurrentPointer : INTEGER
DECLARE NodeCount      : INTEGER

CurrentPointer <- StartPointer
NodeCount      <- 0

WHILE CurrentPointer <> 0 DO          // 0 means end of list; also handles
                                      // an empty list
    OUTPUT Nodes[CurrentPointer].Data
    NodeCount <- NodeCount + 1

    CurrentPointer <- Nodes[CurrentPointer].Pointer   // follow the link
ENDWHILE

OUTPUT NodeCount, " nodes in the list"`,
  ms:[
    {m:1,t:"A current-pointer variable initialised from StartPointer."},
    {m:1,t:"A WHILE loop, so an empty list outputs nothing."},
    {m:1,t:"Loop condition tests the pointer against 0."},
    {m:1,t:"The Data field of the current node is output using correct dot notation."},
    {m:1,t:"The current pointer advanced using the Pointer field, after the data is used."},
    {m:1,t:"A counter initialised before the loop, increased inside, and output after it."}
  ]
},

/* ---------------- SYNTAX DRILLS (MCQ) ---------------- */
{
  id:"D01", level:"as", topic:"Syntax drill", paper:2, marks:1, kind:"mcq",
  title:"Assignment",
  stem:`<p>Which line correctly stores the value 25 in an INTEGER variable called <code>Total</code>?</p>`,
  options:[`Total = 25`,`Total <- 25`,`25 -> Total`,`SET Total TO 25`],
  correct:1,
  explain:`Assignment is always the left arrow, with the variable on the left. <code>=</code> is only a comparison &mdash; except in a CONSTANT declaration.`,
  tips:[`Two of these are from real programming languages, not from the syllabus.`,`Which direction does data travel, and which symbol shows it?`,`The variable receiving the value goes on the left of an arrow.`]
},
{
  id:"D02", level:"as", topic:"Syntax drill", paper:2, marks:1, kind:"mcq",
  title:"Not equal to",
  stem:`<p>Which operator means &ldquo;is not equal to&rdquo;?</p>`,
  options:[`!=`,`/=`,`<>`,`NOT=`],
  correct:2,
  explain:`The syllabus uses <code>&lt;&gt;</code>. The others belong to Python, Ada and nothing respectively, and will not be credited.`,
  tips:[`Three of these come from actual programming languages.`,`It is built from the less-than and greater-than symbols.`,`It is written <code>&lt;&gt;</code> &mdash; "less than or greater than", in other words not equal.`]
},
{
  id:"D03", level:"as", topic:"Syntax drill", paper:2, marks:1, kind:"mcq",
  title:"Closing a FOR loop",
  stem:`<p>A loop begins <code>FOR Row &#8592; 1 TO 8</code>. How must it end?</p>`,
  options:[`ENDFOR`,`NEXT Row`,`NEXT`,`LOOP Row`],
  correct:1,
  explain:`A FOR loop closes with <code>NEXT</code> followed by the <strong>same counter variable</strong>. There is no ENDFOR in this notation, and NEXT on its own is usually not credited.`,
  tips:[`It is not the "END + keyword" pattern that IF and WHILE use.`,`The closing line names something.`,`It names the counter variable from the FOR line.`]
},
{
  id:"D04", level:"as", topic:"Syntax drill", paper:2, marks:1, kind:"mcq",
  title:"REPEAT semantics",
  stem:`<p>A <code>REPEAT &hellip; UNTIL X &gt; 10</code> loop is reached when X is already 50. How many times does the body run?</p>`,
  options:[`Zero times`,`Once`,`Forever`,`Ten times`],
  correct:1,
  explain:`REPEAT tests its condition <strong>after</strong> the body, so the body always runs at least once, even when the condition is already true. This is exactly what distinguishes it from WHILE.`,
  tips:[`Where in the loop is the condition written?`,`The condition sits at the bottom, so something has already happened before it is tested.`,`Compare this with WHILE, which would run zero times. REPEAT cannot run zero times.`]
},
{
  id:"D05", level:"as", topic:"Syntax drill", paper:2, marks:1, kind:"mcq",
  title:"MID",
  stem:`<p>What is the value of <code>MID("PROGRAMMING", 4, 3)</code>?</p>`,
  options:[`"GRA"`,`"OGR"`,`"GRAM"`,`"RAM"`],
  correct:0,
  explain:`MID takes a <em>length</em>, not an end position. Counting from 1: P(1) R(2) O(3) G(4) R(5) A(6). Starting at 4 and taking 3 characters gives "GRA".`,
  tips:[`Count the character positions starting from 1, not 0.`,`The third argument is how many characters to take, not where to stop.`,`Position 4 is the letter G. Take three characters from there.`]
},
{
  id:"D06", level:"as", topic:"Syntax drill", paper:2, marks:1, kind:"mcq",
  title:"DIV and MOD",
  stem:`<p>What is the value of <code>MOD(47, 5)</code>?</p>`,
  options:[`9`,`9.4`,`2`,`5`],
  correct:2,
  explain:`MOD gives the <strong>remainder</strong>. 5 goes into 47 nine times making 45, leaving 2. <code>DIV(47, 5)</code> would give 9.`,
  tips:[`One of these is what DIV would give you, not MOD.`,`MOD is about what is left over after the whole divisions.`,`Nine 5s make 45. How much of the 47 is left?`]
},
{
  id:"D07", level:"a2", topic:"Syntax drill", paper:4, marks:1, kind:"mcq",
  title:"Calling methods",
  stem:`<p><code>Account</code> is an object with a procedure <code>Deposit</code> and a function <code>GetBalance</code>. Which pair of lines is correct?</p>`,
  options:[
    `CALL Account.Deposit(50)  /  OUTPUT Account.GetBalance()`,
    `Account.Deposit(50)  /  CALL OUTPUT Account.GetBalance()`,
    `CALL Account.Deposit(50)  /  CALL Account.GetBalance()`,
    `Account.Deposit(50)  /  Account.GetBalance()`
  ],
  correct:0,
  explain:`Procedures are invoked with <code>CALL</code>. Functions are not &mdash; they return a value, so they are used inside an expression or an OUTPUT.`,
  tips:[`One of these keywords belongs to only one of the two kinds of subroutine.`,`Which one produces a value that has to go somewhere?`,`Procedure gets CALL; function does not, because its result is being output.`]
},
{
  id:"D08", level:"a2", topic:"Syntax drill", paper:4, marks:1, kind:"mcq",
  title:"Encapsulation",
  stem:`<p>Why are class attributes declared PRIVATE?</p>`,
  options:[
    `It makes the program run faster`,
    `So they can only be changed through the class's own methods, which can validate the new value`,
    `Because PUBLIC attributes cannot be inherited`,
    `To save memory`
  ],
  correct:1,
  explain:`This is encapsulation. Private attributes cannot be set directly from outside, so every change goes through a method that can reject invalid values &mdash; the object can never hold nonsense data.`,
  tips:[`It has nothing to do with speed or memory.`,`Think about what a setter method can do that a direct assignment cannot.`,`It is about protecting the data from being set to an invalid value.`]
}
];


__g.DIFFICULTY_ALEVEL = {
  Q01:1,Q02:2,Q03:3,Q04:2,Q05:1,Q06:2,Q07:3,Q08:2,Q09:3,Q10:3,Q11:4,Q12:4,
  Q13:2,Q14:3,Q15:4,Q16:2,Q17:2,Q18:3,Q19:2,Q20:3,Q21:4,Q22:3,Q23:3,Q24:4,
  Q25:2,Q26:4,Q27:4,Q28:4,Q29:3,Q30:4,Q31:5,Q32:5,
  D01:1,D02:1,D03:1,D04:2,D05:2,D06:1,D07:2,D08:2
};


__g.RUNSPECS_ALEVEL = {
  Q01:{ inputs:"" },
  Q02:{ inputs:"3725" },
  Q03:{ inputs:"7.5" },
  Q04:{ setup:"PROCEDURE BorrowBook()\n    OUTPUT \"[borrow]\"\nENDPROCEDURE\nPROCEDURE ReturnBook()\n    OUTPUT \"[return]\"\nENDPROCEDURE\nPROCEDURE SearchCatalogue()\n    OUTPUT \"[search]\"\nENDPROCEDURE", inputs:"3" },
  Q05:{ inputs:"" },
  Q06:{ inputs:"150\n-4\n72" },
  Q07:{ inputs:"12.50\n8.00\n25.75\n-1" },
  Q08:{ setup:"DECLARE Rainfall : ARRAY[1:12] OF REAL\nDECLARE Seed : INTEGER\nFOR Seed <- 1 TO 12\n    Rainfall[Seed] <- Seed * 7.5\nNEXT Seed" },
  Q09:{ setup:"DECLARE Scores : ARRAY[1:40] OF INTEGER\nDECLARE Seed : INTEGER\nFOR Seed <- 1 TO 40\n    Scores[Seed] <- MOD(Seed * 17, 63) - 1\nNEXT Seed" },
  Q10:{ setup:"DECLARE Members : ARRAY[1:200] OF STRING\nDECLARE Seed : INTEGER\nFOR Seed <- 1 TO 200\n    Members[Seed] <- \"Member\" & NUM_TO_STRING(Seed)\nNEXT Seed",
        harness:"OUTPUT \"Looking for Member42 -> position \", FindMember(\"Member42\")\nOUTPUT \"Looking for Nobody   -> position \", FindMember(\"Nobody\")" },
  Q11:{ setup:"DECLARE Prices : ARRAY[1:50] OF REAL\nDECLARE Seed : INTEGER\nFOR Seed <- 1 TO 50\n    Prices[Seed] <- MOD(Seed * 13, 47) + 0.5\nNEXT Seed",
        harness:"OUTPUT \"First five after sorting:\"\nFOR Seed <- 1 TO 5\n    OUTPUT Prices[Seed]\nNEXT Seed" },
  Q12:{ setup:"DECLARE Sales : ARRAY[1:5, 1:12] OF REAL\nDECLARE R : INTEGER\nDECLARE C : INTEGER\nFOR R <- 1 TO 5\n    FOR C <- 1 TO 12\n        Sales[R, C] <- MOD(R * C * 7, 40) + 10.0\n    NEXT C\nNEXT R" },
  Q13:{ harness:"OUTPUT \"e in Engineer -> \", CountChar(\"Engineer\", 'e')\nOUTPUT \"z in Engineer -> \", CountChar(\"Engineer\", 'z')" },
  Q14:{ harness:"OUTPUT \"Racecar  -> \", IsPalindrome(\"Racecar\")\nOUTPUT \"Pseudocode -> \", IsPalindrome(\"Pseudocode\")" },
  Q15:{ setup:"DECLARE FullName : STRING\nFullName <- \"Ada Marie Lovelace\"" },
  Q17:{ harness:"OUTPUT LargestOfThree(3.0, 9.5, 7.0)" },
  Q22:{ inputs:"12\n80\n51\n3\n99\n50\n7\n64\n100\n2" },
  Q23:{ files:[{ name:"Log.txt", lines:["ERROR disk full","INFO backup started","ERROR timeout on port 8080","INFO backup complete","WARN low memory","ERROR checksum mismatch"] }] },
  Q24:{ files:[{ name:"Members.txt", lines:["Amara Okafor","Ravi Deshmukh","Sofia Aldana"] }], inputs:"Lena Farah" },
  Q25:{ },
  Q26:{ setup:"TYPE Booking\n    DECLARE BookingRef   : STRING\n    DECLARE CustomerName : STRING\n    DECLARE FilmTitle    : STRING\n    DECLARE SeatCount    : INTEGER\n    DECLARE TotalPrice   : REAL\n    DECLARE Paid         : BOOLEAN\nENDTYPE\n\nDECLARE Bookings : ARRAY[1:1000] OF Booking\nDECLARE BookingCount : INTEGER\nDECLARE Seed : INTEGER\n\nBookingCount <- 6\nFOR Seed <- 1 TO BookingCount\n    Bookings[Seed].BookingRef   <- \"CN4802\" & NUM_TO_STRING(Seed)\n    Bookings[Seed].CustomerName <- \"Customer \" & NUM_TO_STRING(Seed)\n    Bookings[Seed].FilmTitle    <- \"Film \" & NUM_TO_STRING(Seed)\n    Bookings[Seed].SeatCount    <- MOD(Seed * 3, 7) + 1\n    Bookings[Seed].TotalPrice   <- Bookings[Seed].SeatCount * 9.5\n    Bookings[Seed].Paid         <- (MOD(Seed, 2) = 0)\nNEXT Seed" },
  Q27:{ harness:"DECLARE TestStat : Thermostat\nTestStat <- NEW Thermostat(\"Hallway\", 19.5)\nCALL TestStat.SetTarget(21.0)\nOUTPUT \"Target is now \", TestStat.GetTarget()\nCALL TestStat.SetTarget(99.0)\nOUTPUT \"Target after an invalid change: \", TestStat.GetTarget()\nOUTPUT \"Heat at 18 degrees? \", TestStat.ShouldHeat(18.0)" },
  Q28:{ setup:"CLASS Employee\n    PRIVATE Name         : STRING\n    PRIVATE AnnualSalary : REAL\n\n    PUBLIC PROCEDURE NEW(N : STRING, S : REAL)\n        Name         <- N\n        AnnualSalary <- S\n    ENDPROCEDURE\n\n    PUBLIC FUNCTION GetSalary() RETURNS REAL\n        RETURN AnnualSalary\n    ENDFUNCTION\nENDCLASS",
        harness:"DECLARE Head : Manager\nHead <- NEW Manager(\"Sofia Aldana\", 52000.00, 12.5)\nOUTPUT \"Total pay: \", Head.GetTotalPay()" },
  Q29:{ harness:"OUTPUT \"2 to the power 5 = \", Power(2.0, 5)\nOUTPUT \"7 to the power 0 = \", Power(7.0, 0)" },
  Q30:{ setup:"DECLARE StackData : ARRAY[1:100] OF INTEGER\nDECLARE TopPointer : INTEGER\nTopPointer <- 0",
        harness:"CALL Push(10)\nCALL Push(20)\nCALL Push(30)\nOUTPUT \"Popped: \", Pop()\nOUTPUT \"Popped: \", Pop()\nOUTPUT \"Popped: \", Pop()\nOUTPUT \"Popped from empty: \", Pop()" },
  Q31:{ setup:"DECLARE Sorted : ARRAY[1:1000] OF INTEGER\nDECLARE Seed : INTEGER\nFOR Seed <- 1 TO 1000\n    Sorted[Seed] <- Seed * 3\nNEXT Seed",
        harness:"OUTPUT \"Find 300 -> position \", BinarySearch(300)\nOUTPUT \"Find 301 -> position \", BinarySearch(301)" },
  Q32:{ setup:"TYPE TNode\n    DECLARE Data    : INTEGER\n    DECLARE Pointer : INTEGER\nENDTYPE\n\nDECLARE Nodes : ARRAY[1:200] OF TNode\nDECLARE StartPointer : INTEGER\n\nStartPointer <- 4\nNodes[4].Data <- 17\nNodes[4].Pointer <- 9\nNodes[9].Data <- 42\nNodes[9].Pointer <- 2\nNodes[2].Data <- 8\nNodes[2].Pointer <- 7\nNodes[7].Data <- 91\nNodes[7].Pointer <- 0" }
};

