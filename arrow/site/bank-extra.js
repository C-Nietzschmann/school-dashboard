/* ============================================================================
   ADDITIONAL 9618 QUESTIONS - AS (Paper 2) and A Level (Paper 4)
   ========================================================================== */
"use strict";
var __g = (typeof window !== "undefined") ? window : globalThis;

__g.QUESTIONS_EXTRA = [

/* ==================== AS / PAPER 2 ==================== */
{ id:"S01", level:"as", topic:"Selection", paper:2, diff:2, marks:5, kind:"code",
  title:"Leap year",
  stem:`<p>A year is input. Output whether it is a leap year.</p>
        <p>A year is a leap year if it divides exactly by 4, <strong>except</strong> that years dividing exactly by 100 are not leap years, <strong>unless</strong> they also divide exactly by 400. So 2024 and 2000 are leap years; 1900 is not.</p>`,
  tips:[`Three conditions interact. Write them out in English first and the structure will follow.`,
        `Divides exactly means the remainder is zero. One function gives you a remainder.`,
        `The neat single condition is: divisible by 400, OR (divisible by 4 AND not divisible by 100). Test that against 1900 and 2000 before you rely on it.`],
  run:{ inputs:"1900" },
  model:
`DECLARE Year : INTEGER

OUTPUT "Enter a year: "
INPUT Year

IF MOD(Year, 400) = 0 OR (MOD(Year, 4) = 0 AND MOD(Year, 100) <> 0) THEN
    OUTPUT Year, " is a leap year"
ELSE
    OUTPUT Year, " is not a leap year"
ENDIF`,
  ms:[{m:1,t:"A year input into a declared INTEGER variable."},
      {m:1,t:"MOD used to test exact division."},
      {m:1,t:"Division by 4 tested."},
      {m:1,t:"The century rule handled: divisible by 100 excluded unless also by 400."},
      {m:1,t:"Both outcomes produce a message and every IF is closed."}] },

{ id:"S02", level:"as", topic:"Selection", paper:2, diff:3, marks:6, kind:"code",
  title:"Income tax bands",
  stem:`<p>Tax is charged on an annual income in bands:</p>
        <ul><li>the first 12000 is not taxed</li><li>income from 12001 to 50000 is taxed at 20%</li><li>anything above 50000 is taxed at 40%</li></ul>
        <p>An income is input. Output the total tax due. Note that a high earner pays 20% on the middle band <em>and</em> 40% only on the part above 50000.</p>`,
  tips:[`This is not a "which band are you in" question. Someone earning 60000 pays tax in two bands, not one.`,
        `Work out the tax band by band, adding each part to a running total.`,
        `If income is over 50000, add 40% of (Income - 50000), then add 20% of (50000 - 12000). If it is between, add 20% of (Income - 12000).`],
  run:{ inputs:"60000" },
  model:
`CONSTANT Allowance = 12000
CONSTANT UpperLimit = 50000

DECLARE Income, Tax : REAL

OUTPUT "Enter annual income: "
INPUT Income

Tax <- 0

IF Income > UpperLimit THEN
    Tax <- Tax + (Income - UpperLimit) * 0.40          // top band
    Tax <- Tax + (UpperLimit - Allowance) * 0.20       // full middle band
ELSE
    IF Income > Allowance THEN
        Tax <- Tax + (Income - Allowance) * 0.20       // part of the middle
    ENDIF
ENDIF

OUTPUT "Tax due: ", Tax`,
  ms:[{m:1,t:"Constants used for the allowance and the upper limit."},
      {m:1,t:"The running tax total initialised to zero."},
      {m:1,t:"Income up to the allowance is untaxed."},
      {m:1,t:"20% applied to the part of the income inside the middle band only."},
      {m:1,t:"40% applied to the part above the upper limit only."},
      {m:1,t:"A high earner is charged in both bands, not just the top one."}] },

{ id:"S03", level:"as", topic:"Iteration", paper:2, diff:3, marks:6, kind:"code",
  title:"Times table grid",
  stem:`<p>Output a multiplication grid for 1 to 5, one row per number, with the products separated by spaces.</p>
        <p>The first row should read <code>1 2 3 4 5</code> and the last <code>5 10 15 20 25</code>.</p>`,
  tips:[`Two nested loops: the outer chooses the row, the inner walks across the columns.`,
        `Each row is one line of output, so build the whole row as a string before outputting it.`,
        `Reset the row string to <code>""</code> at the start of each row - inside the outer loop. Use <code>NUM_TO_STRING</code> to join a number onto a string.`],
  model:
`DECLARE Row : STRING
DECLARE r, c : INTEGER

FOR r <- 1 TO 5
    Row <- ""                        // reset once per row
    FOR c <- 1 TO 5
        Row <- Row & NUM_TO_STRING(r * c) & " "
    NEXT c
    OUTPUT Row
NEXT r`,
  ms:[{m:1,t:"An outer loop over the rows 1 to 5."},
      {m:1,t:"An inner loop over the columns 1 to 5."},
      {m:1,t:"The row string reset to empty inside the outer loop."},
      {m:1,t:"The product calculated from both counters."},
      {m:1,t:"NUM_TO_STRING used so the number can be joined with &."},
      {m:1,t:"Inner loop closed before the outer one and the row output once per row."}] },

{ id:"S04", level:"as", topic:"Arrays", paper:2, diff:4, marks:7, kind:"code",
  title:"Insertion sort",
  stem:`<p>An array <code>Names</code> of <code>ARRAY[1:10] OF STRING</code> holds unsorted names.</p>
        <p>Sort it into ascending alphabetical order using an <strong>insertion sort</strong>, then output the sorted list.</p>`,
  tips:[`An insertion sort takes each element in turn and slides it back into its correct place among the elements already sorted behind it.`,
        `Take element i into a temporary variable. Then shift every earlier element that is greater than it one place to the right, and drop the temporary into the gap.`,
        `The inner loop is a WHILE, because you do not know how far back you will have to shift: <code>WHILE j >= 1 AND Names[j] > Current DO</code>.`],
  run:{ setup:"DECLARE Names : ARRAY[1:10] OF STRING\nDECLARE Seed : INTEGER\nFOR Seed <- 1 TO 10\n    Names[Seed] <- CHR(90 - Seed) & \"name\"\nNEXT Seed" },
  model:
`DECLARE i, j : INTEGER
DECLARE Current : STRING

FOR i <- 2 TO 10                       // element 1 counts as sorted
    Current <- Names[i]                // lift it out
    j <- i - 1

    WHILE j >= 1 AND Names[j] > Current DO
        Names[j + 1] <- Names[j]       // shift right to make room
        j <- j - 1
    ENDWHILE

    Names[j + 1] <- Current            // drop it into the gap
NEXT i

FOR i <- 1 TO 10
    OUTPUT Names[i]
NEXT i`,
  ms:[{m:1,t:"An outer loop starting at element 2."},
      {m:1,t:"The current element saved into a temporary variable."},
      {m:1,t:"An inner WHILE loop with a condition testing both the lower bound and the comparison."},
      {m:1,t:"Elements shifted one place to the right inside the inner loop."},
      {m:1,t:"The index decreased each time round the inner loop."},
      {m:1,t:"The saved value placed at position j + 1 after the inner loop."},
      {m:1,t:"The sorted array output afterwards."}] },

{ id:"S05", level:"as", topic:"Arrays", paper:2, diff:3, marks:6, kind:"code",
  title:"Merging two sorted arrays",
  stem:`<p>Two arrays <code>A</code> and <code>B</code>, each <code>ARRAY[1:5] OF INTEGER</code>, are already sorted in ascending order.</p>
        <p>Produce a single array <code>C</code> of <code>ARRAY[1:10] OF INTEGER</code> holding all ten values in ascending order, then output it.</p>
        <p>Do not sort C afterwards &mdash; build it in order.</p>`,
  tips:[`Keep a separate index into each of the three arrays. At each step, compare the two values you are currently pointing at.`,
        `Copy the smaller one into C and advance only that array's index. Advance C's index every time.`,
        `When one array runs out, copy whatever is left of the other. That tail is where most people lose the marks.`],
  run:{ setup:"DECLARE A, B : ARRAY[1:5] OF INTEGER\nDECLARE C : ARRAY[1:10] OF INTEGER\nDECLARE Seed : INTEGER\nFOR Seed <- 1 TO 5\n    A[Seed] <- Seed * 2\n    B[Seed] <- Seed * 2 - 1\nNEXT Seed" },
  model:
`DECLARE ia, ib, ic : INTEGER

ia <- 1
ib <- 1
ic <- 1

WHILE ia <= 5 AND ib <= 5 DO          // both still have values
    IF A[ia] <= B[ib] THEN
        C[ic] <- A[ia]
        ia <- ia + 1
    ELSE
        C[ic] <- B[ib]
        ib <- ib + 1
    ENDIF
    ic <- ic + 1
ENDWHILE

WHILE ia <= 5 DO                      // copy whatever is left of A
    C[ic] <- A[ia]
    ia <- ia + 1
    ic <- ic + 1
ENDWHILE

WHILE ib <= 5 DO                      // or of B
    C[ic] <- B[ib]
    ib <- ib + 1
    ic <- ic + 1
ENDWHILE

FOR ic <- 1 TO 10
    OUTPUT C[ic]
NEXT ic`,
  ms:[{m:1,t:"Three indexes initialised before the merge."},
      {m:1,t:"A loop that continues while both arrays still have values."},
      {m:1,t:"The two current values compared and the smaller copied."},
      {m:1,t:"Only the index of the array that supplied the value is advanced."},
      {m:1,t:"The destination index advanced on every copy."},
      {m:1,t:"The remaining tail of whichever array is left over is copied."}] },

{ id:"S06", level:"as", topic:"Strings", paper:2, diff:3, marks:6, kind:"code",
  title:"Splitting a full name",
  stem:`<p>A STRING holds a name as <code>"Lastname, Firstname"</code> &mdash; for example <code>"Okafor, Amara"</code>.</p>
        <p>Output it the other way round as <code>"Amara Okafor"</code>. There is exactly one comma, followed by exactly one space.</p>`,
  tips:[`First find where the comma is. Walk the string until you hit it and remember the position.`,
        `Everything before the comma is the surname. Everything from two characters after it to the end is the first name.`,
        `<code>LEFT(Name, CommaPos - 1)</code> gives the surname. <code>MID(Name, CommaPos + 2, LENGTH(Name) - CommaPos - 1)</code> gives the first name.`],
  run:{ inputs:"Okafor, Amara" },
  model:
`DECLARE Name, Surname, FirstName : STRING
DECLARE i, CommaPos : INTEGER

OUTPUT "Enter name as Lastname, Firstname: "
INPUT Name

CommaPos <- 0

FOR i <- 1 TO LENGTH(Name)              // find the comma
    IF MID(Name, i, 1) = "," THEN
        CommaPos <- i
    ENDIF
NEXT i

IF CommaPos > 0 THEN
    Surname   <- LEFT(Name, CommaPos - 1)
    FirstName <- MID(Name, CommaPos + 2, LENGTH(Name) - CommaPos - 1)
    OUTPUT FirstName, " ", Surname
ELSE
    OUTPUT "No comma found"
ENDIF`,
  ms:[{m:1,t:"A loop that searches the string for the comma."},
      {m:1,t:"The position of the comma stored in a variable."},
      {m:1,t:"The surname extracted as everything before the comma."},
      {m:1,t:"The first name extracted from two characters after the comma."},
      {m:1,t:"The length of the second part calculated correctly."},
      {m:1,t:"The two parts output in the reversed order with a space between."}] },

{ id:"S07", level:"as", topic:"Subroutines", paper:2, diff:3, marks:6, kind:"code",
  title:"A function and a procedure together",
  stem:`<p>Write a function <code>IsPrime</code> that takes an INTEGER and returns TRUE if it is prime.</p>
        <p>Then write a procedure <code>ListPrimes</code> that takes an upper limit and outputs every prime from 2 up to it, using your function.</p>`,
  tips:[`A number is prime if nothing between 2 and one less than itself divides into it exactly. Numbers below 2 are not prime.`,
        `Use a flag that starts TRUE and is set to FALSE the moment you find a divisor.`,
        `<code>IsPrime</code> is a FUNCTION with RETURNS BOOLEAN. <code>ListPrimes</code> is a PROCEDURE, so it is invoked with CALL - and inside it the function is used without CALL, in the IF condition.`],
  model:
`FUNCTION IsPrime(N : INTEGER) RETURNS BOOLEAN
    DECLARE d : INTEGER
    DECLARE Prime : BOOLEAN

    IF N < 2 THEN
        RETURN FALSE
    ENDIF

    Prime <- TRUE

    FOR d <- 2 TO N - 1
        IF MOD(N, d) = 0 THEN
            Prime <- FALSE
        ENDIF
    NEXT d

    RETURN Prime
ENDFUNCTION


PROCEDURE ListPrimes(Limit : INTEGER)
    DECLARE i : INTEGER
    FOR i <- 2 TO Limit
        IF IsPrime(i) THEN            // no CALL - it returns a value
            OUTPUT i
        ENDIF
    NEXT i
ENDPROCEDURE

CALL ListPrimes(20)`,
  ms:[{m:1,t:"IsPrime declared as a FUNCTION with RETURNS BOOLEAN."},
      {m:1,t:"Numbers below 2 correctly rejected."},
      {m:1,t:"A loop testing possible divisors using MOD."},
      {m:1,t:"A flag set to FALSE when a divisor is found, and returned."},
      {m:1,t:"ListPrimes declared as a PROCEDURE with a typed parameter."},
      {m:1,t:"The function used inside the IF condition without CALL, and the procedure invoked with CALL."}] },

{ id:"S08", level:"as", topic:"Files", paper:2, diff:4, marks:7, kind:"code",
  title:"Filtering a file into another file",
  stem:`<p>A file <code>"Marks.txt"</code> holds one record per line in the form <code>name,mark</code> &mdash; for example <code>Amara,72</code>.</p>
        <p>Read it and write only the records with a mark of 50 or more into a second file <code>"Passes.txt"</code>. Output how many records were copied.</p>`,
  tips:[`You need both files open at once: one for reading, one for writing. Open both, work, close both.`,
        `For each line, find the comma, take the part after it, and convert that to a number.`,
        `<code>MID(Line, CommaPos + 1, LENGTH(Line) - CommaPos)</code> gives the mark as text; <code>STRING_TO_NUM</code> turns it into a number you can compare.`],
  run:{ files:[{name:"Marks.txt", lines:["Amara,72","Ravi,45","Sofia,88","Lena,31","Tom,50"]}] },
  model:
`DECLARE Line, MarkText : STRING
DECLARE i, CommaPos, Mark, Copied : INTEGER

Copied <- 0

OPENFILE "Marks.txt" FOR READ
OPENFILE "Passes.txt" FOR WRITE

WHILE NOT EOF("Marks.txt") DO
    READFILE "Marks.txt", Line

    CommaPos <- 0
    FOR i <- 1 TO LENGTH(Line)
        IF MID(Line, i, 1) = "," THEN
            CommaPos <- i
        ENDIF
    NEXT i

    MarkText <- MID(Line, CommaPos + 1, LENGTH(Line) - CommaPos)
    Mark <- STRING_TO_NUM(MarkText)

    IF Mark >= 50 THEN
        WRITEFILE "Passes.txt", Line
        Copied <- Copied + 1
    ENDIF
ENDWHILE

CLOSEFILE "Marks.txt"
CLOSEFILE "Passes.txt"

OUTPUT Copied, " records copied"`,
  ms:[{m:1,t:"One file opened FOR READ and the other FOR WRITE."},
      {m:1,t:"A WHILE NOT EOF loop over the source file."},
      {m:1,t:"The comma located within each line."},
      {m:1,t:"The mark extracted as the part after the comma."},
      {m:1,t:"STRING_TO_NUM used so the mark can be compared numerically."},
      {m:1,t:"Only records of 50 or more written to the second file."},
      {m:1,t:"Both files closed and the count output afterwards."}] },

{ id:"S09", level:"as", topic:"Tracing", paper:2, diff:3, marks:5, kind:"trace",
  title:"Trace a swap inside a loop",
  stem:`<p>Complete the trace table. Write a value in every cell.</p>`,
  stemCode:
`P <- 2
Q <- 9

FOR i <- 1 TO 3
    IF P < Q THEN
        P <- P * 2
    ELSE
        Q <- Q + 3
    ENDIF
    OUTPUT P, " ", Q
NEXT i`,
  cols:["i","P","Q","OUTPUT"],
  rows:[["1","4","9","4 9"],["2","8","9","8 9"],["3","8","12","8 12"]],
  tips:[`Only one of the two branches runs on each pass, so only one variable changes per row. The other keeps its value - write it in anyway, the question asks for every cell.`,
        `Check the condition freshly at the start of each pass using the values from the end of the last one.`,
        `Pass 1: 2 &lt; 9 so P doubles to 4. Pass 2: 4 &lt; 9 so P doubles to 8. Pass 3: 8 &lt; 9 is still true... check that one carefully.`],
  ms:[{m:1,t:"Three rows used, one per pass."},
      {m:1,t:"P doubles on the first two passes, giving 4 then 8."},
      {m:1,t:"On the third pass 8 < 9 is still true, so P doubles again rather than Q changing."},
      {m:1,t:"Q stays at 9 throughout."},
      {m:1,t:"The output column matches the values at the end of each pass."}] },

/* ==================== A LEVEL / PAPER 4 ==================== */
{ id:"T01", level:"a2", topic:"Records", paper:4, diff:3, marks:6, kind:"code",
  title:"Building a record type",
  stem:`<p>A gym stores, for each member: a membership number, a name, the month they joined as a number, a monthly fee, and whether their payment is up to date.</p>
        <p>Define a suitable record type, declare an array for 200 members, store one member, and output their details.</p>`,
  tips:[`A record groups fields of different types under one name. Define the shape once with TYPE, then declare variables of that new type.`,
        `Each field inside the definition is declared exactly as an ordinary variable would be.`,
        `Once the type exists you can use it like any other: <code>DECLARE Members : ARRAY[1:200] OF Member</code>. Fields are reached with a dot after the index.`],
  model:
`TYPE Member
    DECLARE MemberNo  : INTEGER
    DECLARE Name      : STRING
    DECLARE JoinMonth : INTEGER
    DECLARE Fee       : REAL
    DECLARE UpToDate  : BOOLEAN
ENDTYPE

DECLARE Members : ARRAY[1:200] OF Member

Members[1].MemberNo  <- 4071
Members[1].Name      <- "Lena Farah"
Members[1].JoinMonth <- 3
Members[1].Fee       <- 29.50
Members[1].UpToDate  <- TRUE

OUTPUT Members[1].Name, " pays ", Members[1].Fee`,
  ms:[{m:1,t:"TYPE used with a name and closed with ENDTYPE."},
      {m:1,t:"All five fields declared inside the type definition."},
      {m:1,t:"Appropriate types chosen, with REAL for the fee and BOOLEAN for the payment flag."},
      {m:1,t:"An array of 200 declared OF the new record type."},
      {m:1,t:"Fields assigned using index-then-dot notation."},
      {m:1,t:"Values of the correct types assigned to each field."}] },

{ id:"T02", level:"a2", topic:"Records", paper:4, diff:4, marks:7, kind:"code",
  title:"Reporting on an array of records",
  stem:`<p>Using the <code>Member</code> record from the previous question, and with <code>MemberCount</code> holding how many members are actually stored:</p>
        <p>Output the total monthly income from members who are up to date, how many are in arrears, and the name of the longest-standing member (the smallest join month).</p>`,
  tips:[`Loop only as far as MemberCount, not to 200 - the rest of the array is empty and would corrupt your results.`,
        `Three things are tracked at once: a conditional running total, a counter, and a smallest-so-far with its name remembered alongside.`,
        `Initialise the smallest join month from the first real member, not from zero - zero would never be beaten.`],
  run:{ setup:"TYPE Member\n    DECLARE MemberNo  : INTEGER\n    DECLARE Name      : STRING\n    DECLARE JoinMonth : INTEGER\n    DECLARE Fee       : REAL\n    DECLARE UpToDate  : BOOLEAN\nENDTYPE\n\nDECLARE Members : ARRAY[1:200] OF Member\nDECLARE MemberCount, Seed : INTEGER\n\nMemberCount <- 8\nFOR Seed <- 1 TO MemberCount\n    Members[Seed].MemberNo  <- 4000 + Seed\n    Members[Seed].Name      <- \"Member\" & NUM_TO_STRING(Seed)\n    Members[Seed].JoinMonth <- MOD(Seed * 5, 12) + 1\n    Members[Seed].Fee       <- 25.0 + Seed\n    Members[Seed].UpToDate  <- (MOD(Seed, 3) <> 0)\nNEXT Seed" },
  model:
`DECLARE i, Arrears, EarliestMonth : INTEGER
DECLARE Income : REAL
DECLARE LongestName : STRING

Income  <- 0
Arrears <- 0

EarliestMonth <- Members[1].JoinMonth      // start from real data
LongestName   <- Members[1].Name

FOR i <- 1 TO MemberCount                  // stop at the real data
    IF Members[i].UpToDate THEN
        Income <- Income + Members[i].Fee
    ELSE
        Arrears <- Arrears + 1
    ENDIF

    IF Members[i].JoinMonth < EarliestMonth THEN
        EarliestMonth <- Members[i].JoinMonth
        LongestName   <- Members[i].Name
    ENDIF
NEXT i

OUTPUT "Monthly income: ", Income
OUTPUT Arrears, " members in arrears"
OUTPUT "Longest standing: ", LongestName`,
  ms:[{m:1,t:"The loop is bounded by MemberCount rather than the array size."},
      {m:1,t:"The income total initialised to zero before the loop."},
      {m:1,t:"Fees added only for members whose payment is up to date."},
      {m:1,t:"A counter increased for those in arrears."},
      {m:1,t:"The earliest join month initialised from the first member, not zero."},
      {m:1,t:"The name updated at the same time as the earliest month."},
      {m:1,t:"Correct dot notation on the indexed array throughout."}] },

{ id:"T03", level:"a2", topic:"OOP", paper:4, diff:4, marks:8, kind:"code",
  title:"A class with validation",
  stem:`<p>Write a class <code>Playlist</code> with:</p>
        <ul>
          <li>private attributes for the playlist name, the number of tracks, and the total length in seconds</li>
          <li>a constructor taking the name, starting the other two at zero</li>
          <li>a method to add a track, taking its length, which refuses any length that is zero or negative</li>
          <li>a function returning the number of tracks</li>
          <li>a function returning the average track length, returning 0 when the playlist is empty</li>
        </ul>`,
  tips:[`Attributes are PRIVATE and the methods the outside world uses are PUBLIC. The constructor is always a procedure called NEW.`,
        `Decide for each method: does it give a value back? If yes it is a FUNCTION with RETURNS; if it just does something, it is a PROCEDURE.`,
        `The validation belongs inside the setter - that is the point of the attributes being private. And the average must guard against dividing by zero tracks.`],
  model:
`CLASS Playlist
    PRIVATE Name : STRING
    PRIVATE TrackCount : INTEGER
    PRIVATE TotalSeconds : INTEGER

    PUBLIC PROCEDURE NEW(PlaylistName : STRING)
        Name <- PlaylistName
        TrackCount <- 0
        TotalSeconds <- 0
    ENDPROCEDURE

    PUBLIC PROCEDURE AddTrack(Seconds : INTEGER)
        IF Seconds > 0 THEN                  // validate before storing
            TrackCount <- TrackCount + 1
            TotalSeconds <- TotalSeconds + Seconds
        ELSE
            OUTPUT "A track must have a positive length"
        ENDIF
    ENDPROCEDURE

    PUBLIC FUNCTION GetCount() RETURNS INTEGER
        RETURN TrackCount
    ENDFUNCTION

    PUBLIC FUNCTION AverageLength() RETURNS REAL
        IF TrackCount = 0 THEN               // never divide by zero
            RETURN 0
        ELSE
            RETURN TotalSeconds / TrackCount
        ENDIF
    ENDFUNCTION
ENDCLASS

DECLARE Mix : Playlist
Mix <- NEW Playlist("Revision")
CALL Mix.AddTrack(210)
CALL Mix.AddTrack(190)
CALL Mix.AddTrack(-5)
OUTPUT Mix.GetCount(), " tracks averaging ", Mix.AverageLength()`,
  ms:[{m:1,t:"CLASS with a name, closed with ENDCLASS."},
      {m:1,t:"All three attributes declared PRIVATE with appropriate types."},
      {m:1,t:"A PUBLIC constructor named NEW taking the playlist name."},
      {m:1,t:"The constructor starts the count and total at zero."},
      {m:1,t:"AddTrack is a PUBLIC PROCEDURE that rejects a non-positive length."},
      {m:1,t:"Both the count and the total updated when a track is accepted."},
      {m:1,t:"GetCount is a FUNCTION with RETURNS INTEGER."},
      {m:1,t:"AverageLength guards against an empty playlist before dividing."}] },

{ id:"T04", level:"a2", topic:"OOP", paper:4, diff:4, marks:7, kind:"code",
  title:"Inheritance and polymorphism",
  stem:`<p>A class <code>Vehicle</code> exists with a private <code>Wheels</code> attribute, a constructor <code>NEW(W : INTEGER)</code>, a public <code>GetWheels() RETURNS INTEGER</code>, and a public <code>Describe() RETURNS STRING</code> that returns <code>"A vehicle"</code>.</p>
        <p>Write a subclass <code>Motorbike</code> that adds an engine size, and replaces <code>Describe</code> with its own version returning <code>"A motorbike"</code> followed by the engine size.</p>
        <p>The subclass must not access <code>Wheels</code> directly.</p>`,
  tips:[`The keyword linking a subclass to its parent goes on the CLASS line. The parent's constructor is reached with SUPER.`,
        `Providing your own version of an inherited method is polymorphism - just declare a method with the same name in the subclass.`,
        `To read the wheel count, go through the inherited public <code>GetWheels()</code> rather than the private attribute. That is exactly why the getter exists.`],
  run:{ setup:"CLASS Vehicle\n    PRIVATE Wheels : INTEGER\n\n    PUBLIC PROCEDURE NEW(W : INTEGER)\n        Wheels <- W\n    ENDPROCEDURE\n\n    PUBLIC FUNCTION GetWheels() RETURNS INTEGER\n        RETURN Wheels\n    ENDFUNCTION\n\n    PUBLIC FUNCTION Describe() RETURNS STRING\n        RETURN \"A vehicle\"\n    ENDFUNCTION\nENDCLASS" },
  model:
`CLASS Motorbike INHERITS Vehicle
    PRIVATE EngineCC : INTEGER

    PUBLIC PROCEDURE NEW(CC : INTEGER)
        CALL SUPER.NEW(2)             // a motorbike always has two wheels
        EngineCC <- CC
    ENDPROCEDURE

    PUBLIC FUNCTION Describe() RETURNS STRING
        RETURN "A motorbike of " & NUM_TO_STRING(EngineCC) & "cc on "
               & NUM_TO_STRING(GetWheels()) & " wheels"
    ENDFUNCTION
ENDCLASS

DECLARE Bike : Motorbike
Bike <- NEW Motorbike(650)
OUTPUT Bike.Describe()`,
  ms:[{m:1,t:"CLASS ... INHERITS ... used correctly, closed with ENDCLASS."},
      {m:1,t:"The additional attribute declared PRIVATE."},
      {m:1,t:"A constructor taking the engine size."},
      {m:1,t:"SUPER.NEW called to initialise the inherited attribute."},
      {m:1,t:"Describe redeclared in the subclass, replacing the inherited version."},
      {m:1,t:"The wheel count obtained through the inherited getter, not the private attribute."},
      {m:1,t:"NUM_TO_STRING used so the numbers can be joined into the returned string."}] },

{ id:"T05", level:"a2", topic:"Algorithms", paper:4, diff:4, marks:7, kind:"code",
  title:"A circular queue",
  stem:`<p>A queue is held in <code>QueueData</code>, an <code>ARRAY[1:5] OF STRING</code>, with INTEGER variables <code>Front</code>, <code>Rear</code> and <code>Count</code>. The queue starts empty with <code>Front</code> and <code>Rear</code> both 1 and <code>Count</code> 0.</p>
        <p>Write a procedure <code>Enqueue</code> that adds an item, reporting an error if the queue is full, and a function <code>Dequeue</code> that removes and returns the front item, returning <code>""</code> if the queue is empty.</p>
        <p>The queue must wrap around when it reaches the end of the array.</p>`,
  tips:[`A queue is first-in first-out. Front points at the next item to leave; Rear points at the next free slot.`,
        `Check for full or empty <em>before</em> touching anything. Count tells you both: full when it equals the array size, empty when it is zero.`,
        `Wrapping is the point of the word "circular". After advancing a pointer past the end, send it back to 1 - either with an IF or with <code>MOD</code>.`],
  run:{ setup:"DECLARE QueueData : ARRAY[1:5] OF STRING\nDECLARE Front, Rear, Count : INTEGER\nFront <- 1\nRear <- 1\nCount <- 0",
        harness:"CALL Enqueue(\"a\")\nCALL Enqueue(\"b\")\nCALL Enqueue(\"c\")\nOUTPUT Dequeue()\nOUTPUT Dequeue()\nCALL Enqueue(\"d\")\nOUTPUT Dequeue()\nOUTPUT Dequeue()\nOUTPUT Dequeue()" },
  model:
`PROCEDURE Enqueue(Item : STRING)
    IF Count >= 5 THEN
        OUTPUT "Queue full"              // check BEFORE writing
    ELSE
        QueueData[Rear] <- Item
        Rear <- Rear + 1
        IF Rear > 5 THEN
            Rear <- 1                    // wrap around
        ENDIF
        Count <- Count + 1
    ENDIF
ENDPROCEDURE


FUNCTION Dequeue() RETURNS STRING
    DECLARE Item : STRING

    IF Count = 0 THEN
        OUTPUT "Queue empty"
        RETURN ""
    ELSE
        Item <- QueueData[Front]         // read, THEN advance
        Front <- Front + 1
        IF Front > 5 THEN
            Front <- 1
        ENDIF
        Count <- Count - 1
        RETURN Item
    ENDIF
ENDFUNCTION`,
  ms:[{m:1,t:"Enqueue is a PROCEDURE and Dequeue a FUNCTION with RETURNS STRING."},
      {m:1,t:"Enqueue tests for a full queue before storing anything."},
      {m:1,t:"Enqueue stores at Rear and then advances it."},
      {m:1,t:"Rear wraps back to 1 when it passes the end of the array."},
      {m:1,t:"Dequeue tests for an empty queue before reading."},
      {m:1,t:"Dequeue reads at Front, then advances Front with the same wrap."},
      {m:1,t:"The count is increased and decreased so both tests stay correct."}] },

{ id:"T06", level:"a2", topic:"Algorithms", paper:4, diff:5, marks:8, kind:"code",
  title:"Inserting into a linked list",
  stem:`<p>A linked list is held in <code>Nodes</code>, an <code>ARRAY[1:100] OF TNode</code> where <code>TNode</code> has <code>Data : INTEGER</code> and <code>Pointer : INTEGER</code>. <code>StartPointer</code> gives the first node, or 0 if empty. <code>FreePointer</code> gives the first node on the free list.</p>
        <p>Write a procedure <code>InsertInOrder</code> that adds a value so the list stays in ascending order.</p>
        <p>Handle three cases: an empty list, inserting before the current first node, and inserting in the middle or at the end.</p>`,
  tips:[`First take a node off the free list and put the value in it. If there is no free node, report that and stop.`,
        `Then decide where it goes. Inserting at the very front is different from inserting anywhere else, because there is no previous node to update.`,
        `For the middle case you need to walk the list keeping <em>two</em> pointers: the node you are looking at, and the one before it. One pointer is not enough - you cannot go backwards.`],
  run:{ setup:"TYPE TNode\n    DECLARE Data : INTEGER\n    DECLARE Pointer : INTEGER\nENDTYPE\n\nDECLARE Nodes : ARRAY[1:100] OF TNode\nDECLARE StartPointer, FreePointer, Seed : INTEGER\n\nStartPointer <- 0\nFreePointer <- 1\nFOR Seed <- 1 TO 99\n    Nodes[Seed].Pointer <- Seed + 1\nNEXT Seed\nNodes[100].Pointer <- 0",
        harness:"DECLARE Cur : INTEGER\nCALL InsertInOrder(40)\nCALL InsertInOrder(10)\nCALL InsertInOrder(30)\nCALL InsertInOrder(20)\nCur <- StartPointer\nWHILE Cur <> 0 DO\n    OUTPUT Nodes[Cur].Data\n    Cur <- Nodes[Cur].Pointer\nENDWHILE" },
  model:
`PROCEDURE InsertInOrder(Value : INTEGER)
    DECLARE NewNode, Current, Previous : INTEGER

    IF FreePointer = 0 THEN
        OUTPUT "No free space"
        RETURN
    ENDIF

    NewNode <- FreePointer                      // take a free node
    FreePointer <- Nodes[FreePointer].Pointer
    Nodes[NewNode].Data <- Value
    Nodes[NewNode].Pointer <- 0

    IF StartPointer = 0 THEN                    // case 1: empty list
        StartPointer <- NewNode
    ELSE
        IF Value <= Nodes[StartPointer].Data THEN    // case 2: new first
            Nodes[NewNode].Pointer <- StartPointer
            StartPointer <- NewNode
        ELSE                                     // case 3: further along
            Previous <- StartPointer
            Current  <- Nodes[StartPointer].Pointer

            WHILE Current <> 0 AND Nodes[Current].Data < Value DO
                Previous <- Current
                Current  <- Nodes[Current].Pointer
            ENDWHILE

            Nodes[NewNode].Pointer  <- Current
            Nodes[Previous].Pointer <- NewNode
        ENDIF
    ENDIF
ENDPROCEDURE`,
  ms:[{m:1,t:"A node taken from the free list and the free pointer advanced."},
      {m:1,t:"The value stored in the new node."},
      {m:1,t:"The case of an empty list handled by setting the start pointer."},
      {m:1,t:"The case of inserting before the first node handled separately."},
      {m:1,t:"Two pointers used to walk the list, tracking the previous node."},
      {m:1,t:"The loop stops at the first node whose data is not smaller than the value."},
      {m:1,t:"The new node points at the current node."},
      {m:1,t:"The previous node is updated to point at the new node."}] },

{ id:"T07", level:"a2", topic:"Algorithms", paper:4, diff:4, marks:6, kind:"code",
  title:"Recursive binary search",
  stem:`<p>An array <code>Sorted</code> of <code>ARRAY[1:100] OF INTEGER</code> is in ascending order.</p>
        <p>Write a <strong>recursive</strong> function <code>BSearch</code> that takes the value being looked for, a low bound and a high bound, and returns the position of the value or <code>0</code> if it is absent.</p>`,
  tips:[`Every recursive function needs a base case that returns without calling itself, and a general case that calls itself on a smaller problem.`,
        `There are two base cases here: the value is found at the midpoint, or the search region has become empty.`,
        `The region is empty when Low is greater than High. Otherwise recurse on either the lower or the upper half, using Mid - 1 and Mid + 1 so the region really does shrink.`],
  run:{ setup:"DECLARE Sorted : ARRAY[1:100] OF INTEGER\nDECLARE Seed : INTEGER\nFOR Seed <- 1 TO 100\n    Sorted[Seed] <- Seed * 4\nNEXT Seed",
        harness:"OUTPUT BSearch(160, 1, 100)\nOUTPUT BSearch(161, 1, 100)" },
  model:
`FUNCTION BSearch(Target : INTEGER, Low : INTEGER, High : INTEGER) RETURNS INTEGER
    DECLARE Mid : INTEGER

    IF Low > High THEN
        RETURN 0                             // base case: nothing left
    ENDIF

    Mid <- DIV(Low + High, 2)

    IF Sorted[Mid] = Target THEN
        RETURN Mid                           // base case: found it
    ELSE
        IF Sorted[Mid] < Target THEN
            RETURN BSearch(Target, Mid + 1, High)   // upper half
        ELSE
            RETURN BSearch(Target, Low, Mid - 1)    // lower half
        ENDIF
    ENDIF
ENDFUNCTION`,
  ms:[{m:1,t:"FUNCTION header with three typed parameters and RETURNS INTEGER."},
      {m:1,t:"A base case returning 0 when Low passes High."},
      {m:1,t:"The midpoint calculated with whole-number division."},
      {m:1,t:"A base case returning the position when the midpoint matches."},
      {m:1,t:"A recursive call on the upper half using Mid + 1."},
      {m:1,t:"A recursive call on the lower half using Mid - 1."}] },

{ id:"T08", level:"a2", topic:"Files", paper:4, diff:4, marks:6, kind:"code",
  title:"Random access records",
  stem:`<p>A random-access file <code>"Stock.dat"</code> stores records of type <code>StockItem</code>, which has fields <code>Code : STRING</code> and <code>Quantity : INTEGER</code>. Record addresses run from 1.</p>
        <p>Write an algorithm that reads the record at address 12, reduces its quantity by 5, and writes it back &mdash; but refuses if that would take the quantity below zero.</p>`,
  tips:[`Random access means you jump straight to a record by its address rather than reading from the start. Three keywords do the work.`,
        `You must move to the address before reading, and move to it <em>again</em> before writing - reading leaves the position past the record.`,
        `<code>SEEK</code> then <code>GETRECORD</code> to read; check the quantity; then <code>SEEK</code> again and <code>PUTRECORD</code> to write it back.`],
  run:{ setup:"TYPE StockItem\n    DECLARE Code : STRING\n    DECLARE Quantity : INTEGER\nENDTYPE" },
  model:
`DECLARE Item : StockItem

OPENFILE "Stock.dat" FOR RANDOM

SEEK "Stock.dat", 12
GETRECORD "Stock.dat", Item

IF Item.Quantity >= 5 THEN
    Item.Quantity <- Item.Quantity - 5

    SEEK "Stock.dat", 12            // move back before writing
    PUTRECORD "Stock.dat", Item

    OUTPUT "Stock reduced to ", Item.Quantity
ELSE
    OUTPUT "Not enough stock to remove 5"
ENDIF

CLOSEFILE "Stock.dat"`,
  ms:[{m:1,t:"The file opened FOR RANDOM."},
      {m:1,t:"SEEK used to move to address 12 before reading."},
      {m:1,t:"GETRECORD used to read the record into a variable of the record type."},
      {m:1,t:"The quantity checked before it is reduced, so it cannot go negative."},
      {m:1,t:"SEEK used again before writing the record back."},
      {m:1,t:"PUTRECORD used to write, and the file closed."}] },

{ id:"T09", level:"a2", topic:"Algorithms", paper:4, diff:5, marks:7, kind:"code",
  title:"Bubble sort with an early exit",
  stem:`<p>An array <code>Values</code> of <code>ARRAY[1:20] OF INTEGER</code> is unsorted.</p>
        <p>Sort it into ascending order with a bubble sort that <strong>stops as soon as the array is in order</strong> rather than always completing every pass.</p>
        <p>Output how many passes were actually needed.</p>`,
  tips:[`A plain bubble sort always does the same number of passes even if the data was already sorted. The improvement is to notice when a pass makes no swaps.`,
        `A pass that swaps nothing means everything is already in order, so you can stop.`,
        `Use a BOOLEAN flag set to FALSE at the start of each pass and TRUE whenever a swap happens. The outer loop becomes a REPEAT or WHILE testing that flag.`],
  run:{ setup:"DECLARE Values : ARRAY[1:20] OF INTEGER\nDECLARE Seed : INTEGER\nFOR Seed <- 1 TO 20\n    Values[Seed] <- MOD(Seed * 11, 31)\nNEXT Seed" },
  model:
`DECLARE i, Temp, Passes, Limit : INTEGER
DECLARE Swapped : BOOLEAN

Passes <- 0
Limit  <- 19

REPEAT
    Swapped <- FALSE                    // assume it is sorted
    Passes  <- Passes + 1

    FOR i <- 1 TO Limit
        IF Values[i] > Values[i + 1] THEN
            Temp          <- Values[i]
            Values[i]     <- Values[i + 1]
            Values[i + 1] <- Temp
            Swapped <- TRUE             // it was not
        ENDIF
    NEXT i

    Limit <- Limit - 1                  // the tail is now in place
UNTIL Swapped = FALSE OR Limit = 0

OUTPUT "Sorted in ", Passes, " passes"`,
  ms:[{m:1,t:"A Boolean flag set to FALSE at the start of every pass."},
      {m:1,t:"An inner loop comparing adjacent elements within the array bounds."},
      {m:1,t:"A three-line swap using a temporary variable."},
      {m:1,t:"The flag set to TRUE whenever a swap takes place."},
      {m:1,t:"The outer loop stops when a pass completes with no swaps."},
      {m:1,t:"The upper bound of the inner loop reduced after each pass."},
      {m:1,t:"A counter records the passes actually used and is output."}] },

{ id:"T10", level:"a2", topic:"OOP", paper:4, diff:3, marks:1, kind:"mcq",
  title:"Why private", stem:`<p>Why are class attributes normally declared PRIVATE?</p>`,
  options:[`It makes the program run faster`,
           `So they can only be changed through the class's own methods, which can reject invalid values`,
           `Because PUBLIC attributes cannot be inherited`,
           `To use less memory`], correct:1,
  explain:`This is encapsulation. Private attributes cannot be set directly from outside, so every change goes through a method that can validate it - the object can never hold nonsense data.`,
  tips:[`It has nothing to do with speed or memory.`,`Think about what a setter method can do that a direct assignment cannot.`,`It is about protecting the data from being set to an invalid value.`] },

{ id:"T11", level:"a2", topic:"Algorithms", paper:4, diff:3, marks:1, kind:"mcq",
  title:"Stack or queue", stem:`<p>Undo in a word processor should be built on which structure, and why?</p>`,
  options:[`A queue, because the oldest action should be undone first`,
           `A stack, because the most recent action should be undone first`,
           `A linked list, because actions vary in size`,
           `An array, because the number of actions is fixed`], correct:1,
  explain:`Undo is last-in first-out: the action you most recently did is the one that gets undone first. That is exactly a stack.`,
  tips:[`Ask which action should be undone first - the one you did first, or the one you did most recently?`,`Most recent first. Which structure removes the most recently added item?`,`Last in, first out.`] },

{ id:"T12", level:"a2", topic:"Algorithms", paper:4, diff:4, marks:1, kind:"mcq",
  title:"Recursion needs a base case", stem:`<p>What happens to a recursive function with no base case?</p>`,
  options:[`It returns zero`,
           `It calls itself until the call stack overflows and the program crashes`,
           `The compiler refuses to accept it`,
           `It runs once and stops`], correct:1,
  explain:`Every call adds a new frame to the call stack and none ever returns, so the stack fills and the program fails. A base case is what lets the recursion unwind.`,
  tips:[`Nothing stops it calling itself again.`,`Each call uses memory that is not released until the call returns.`,`That memory is the call stack, and it is finite.`] }

];
