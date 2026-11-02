/* ============================================================================
   FURTHER A LEVEL LESSONS
   Coverage aligned to the 9618 chapters that the course was missing:
     10.4 Abstract data types      19.1 Algorithms      19.2 Recursion
     13.2 File organisation and access      20.2 Exception handling
   All prose and examples are original.
   ========================================================================== */
"use strict";
var __g = (typeof window !== "undefined") ? window : globalThis;

__g.LESSONS_EXTRA = [

{
  id:"L14", levels:["a2"], title:"Abstract data types: the stack",
  blurb:"Last in, first out. The structure behind undo, recursion and expression evaluation.",
  blocks:[
    {t:"p",html:`An <strong>abstract data type</strong> is a collection of data together with the operations allowed on it. You describe <em>what</em> it does, not how it is stored &mdash; the same stack behaves identically whether it is built from an array or a linked list.`},
    {t:"p",html:`A <strong>stack</strong> is last in, first out. The last thing added is the first thing removed. Only two operations matter: <strong>push</strong> adds an item to the top, <strong>pop</strong> removes the top item and gives it back.`},

    {t:"h",text:"How it is stored"},
    {t:"p",html:`An array holds the items and one INTEGER holds the position of the top. A pointer of 0 means the stack is empty.`},
    {t:"code",src:
`DECLARE StackData : ARRAY[1:100] OF INTEGER
DECLARE TopPointer : INTEGER

TopPointer <- 0        // 0 means empty`},

    {t:"h",text:"Push"},
    {t:"p",html:`Check there is room <em>before</em> writing anything, then move the pointer up and store. Getting that order wrong overwrites the top item.`},
    {t:"code",src:
`PROCEDURE Push(Value : INTEGER)
    IF TopPointer >= 100 THEN
        OUTPUT "Stack overflow"      // full: refuse, do not overwrite
    ELSE
        TopPointer <- TopPointer + 1
        StackData[TopPointer] <- Value
    ENDIF
ENDPROCEDURE`},

    {t:"h",text:"Pop"},
    {t:"p",html:`The mirror image: check it is not empty, read the value at the pointer, <em>then</em> move the pointer down. Read first, move second.`},
    {t:"code",src:
`FUNCTION Pop() RETURNS INTEGER
    DECLARE Value : INTEGER

    IF TopPointer = 0 THEN
        OUTPUT "Stack underflow"     // empty: nothing to give back
        RETURN -1
    ELSE
        Value <- StackData[TopPointer]
        TopPointer <- TopPointer - 1
        RETURN Value
    ENDIF
ENDFUNCTION`},

    {t:"note",kind:"exam",label:"Overflow and underflow",html:`<p>Both guards are marks. <strong>Overflow</strong> is pushing onto a full stack; <strong>underflow</strong> is popping an empty one. A question that says &ldquo;include suitable error handling&rdquo; is asking for exactly these two tests, and nothing else.</p>`},

    {t:"h",text:"Where stacks are used"},
    {t:"list",items:[
      `<strong>Undo</strong> &mdash; the most recent action is the first undone.`,
      `<strong>Recursion</strong> &mdash; each call is pushed onto the call stack and popped when it returns.`,
      `<strong>Expression evaluation</strong> &mdash; operators and operands are stacked while an expression is worked out.`,
      `<strong>Backtracking</strong> &mdash; remembering where you turned, so you can go back to the last junction.`
    ]},

    {t:"check",
      q:`Three values are pushed onto an empty stack in the order 5, 9, 2. One is popped, then 7 is pushed, then two more are popped. What are the three popped values, in order?`,
      marks:3,
      a:`<p>After pushing 5, 9, 2 the top is 2. The first pop gives <strong>2</strong>. Pushing 7 puts it on top of 9. The next pop gives <strong>7</strong>, and the one after gives <strong>9</strong>.</p><p>Answer: <strong>2, 7, 9</strong>. The 5 is still on the stack.</p>`,
      acode:`DECLARE StackData : ARRAY[1:10] OF INTEGER
DECLARE TopPointer : INTEGER
TopPointer <- 0

PROCEDURE Push(V : INTEGER)
    TopPointer <- TopPointer + 1
    StackData[TopPointer] <- V
ENDPROCEDURE

FUNCTION Pop() RETURNS INTEGER
    DECLARE V : INTEGER
    V <- StackData[TopPointer]
    TopPointer <- TopPointer - 1
    RETURN V
ENDFUNCTION

CALL Push(5)
CALL Push(9)
CALL Push(2)
OUTPUT Pop()
CALL Push(7)
OUTPUT Pop()
OUTPUT Pop()`}
  ]
},

{
  id:"L15", levels:["a2"], title:"Abstract data types: queues and linked lists",
  blurb:"First in, first out, why a queue must be circular, and following pointers instead of indexes.",
  blocks:[
    {t:"h",text:"The queue"},
    {t:"p",html:`A <strong>queue</strong> is first in, first out &mdash; a line at a counter. Items join at the <strong>rear</strong> and leave from the <strong>front</strong>. The two operations are <strong>enqueue</strong> (join) and <strong>dequeue</strong> (leave).`},
    {t:"p",html:`It needs three variables, not one: a front pointer, a rear pointer, and a count of how many items are in it.`},
    {t:"code",src:
`DECLARE QueueData : ARRAY[1:5] OF STRING
DECLARE Front, Rear, Count : INTEGER

Front <- 1
Rear  <- 1
Count <- 0`},

    {t:"h",text:"Why it has to be circular"},
    {t:"p",html:`Items leave from the front, so the front pointer creeps upwards and the space behind it is wasted. After five joins and five leaves a straight queue is full of nothing and cannot accept another item.`},
    {t:"p",html:`The fix is to wrap: when a pointer passes the end of the array, send it back to 1. The array is treated as a ring. That is all &ldquo;circular queue&rdquo; means.`},
    {t:"code",src:
`PROCEDURE Enqueue(Item : STRING)
    IF Count >= 5 THEN
        OUTPUT "Queue full"
    ELSE
        QueueData[Rear] <- Item
        Rear <- Rear + 1
        IF Rear > 5 THEN
            Rear <- 1                 // wrap around
        ENDIF
        Count <- Count + 1
    ENDIF
ENDPROCEDURE`},
    {t:"note",kind:"exam",label:"Why the count is needed",html:`<p>With wrapping, front and rear are in the same place both when the queue is <em>empty</em> and when it is <em>full</em>. The pointers alone cannot tell you which. That is why a separate count is kept, and why questions award a mark for it.</p>`},

    {t:"h",text:"The linked list"},
    {t:"p",html:`A <strong>linked list</strong> stores each item in a <strong>node</strong>: the data, plus a pointer to where the next node is. The nodes are not in order in memory &mdash; the pointers put them in order.`},
    {t:"code",src:
`TYPE TNode
    DECLARE Data    : INTEGER
    DECLARE Pointer : INTEGER     // index of the next node, 0 means the end
ENDTYPE

DECLARE Nodes : ARRAY[1:100] OF TNode
DECLARE StartPointer : INTEGER    // the first node, 0 if the list is empty`},

    {t:"h",text:"Walking the list"},
    {t:"p",html:`You never use a FOR loop on a linked list &mdash; the nodes are not in array order. You start at the head and follow the pointers until one of them is 0.`},
    {t:"code",src:
`TYPE TNode
    DECLARE Data    : INTEGER
    DECLARE Pointer : INTEGER
ENDTYPE
DECLARE Nodes : ARRAY[1:100] OF TNode
DECLARE StartPointer, Current : INTEGER

StartPointer <- 3                 // the list runs 3 -> 7 -> 1
Nodes[3].Data <- 10
Nodes[3].Pointer <- 7
Nodes[7].Data <- 20
Nodes[7].Pointer <- 1
Nodes[1].Data <- 30
Nodes[1].Pointer <- 0

Current <- StartPointer

WHILE Current <> 0 DO
    OUTPUT Nodes[Current].Data
    Current <- Nodes[Current].Pointer    // follow the link
ENDWHILE`},
    {t:"note",kind:"warn",label:"The order of those two lines",html:`<p>Use the node, <em>then</em> move on. Advancing the pointer before reading the data silently skips the first item &mdash; and the output looks almost right, which is what makes it hard to spot.</p>`},

    {t:"h",text:"The free list"},
    {t:"p",html:`Unused nodes are not wasted: they are themselves a linked list, chained through the same pointer field, with <em class="term">FreePointer</em> at its head. To insert, you take the first free node; to delete, you give the node back to the free list. Questions about &ldquo;where does a new node come from&rdquo; are asking about this.`},

    {t:"h",text:"Choosing between them"},
    {t:"list",items:[
      `An <strong>array</strong> gives instant access to any element by index, but inserting in the middle means shifting everything after it.`,
      `A <strong>linked list</strong> inserts and deletes by changing two pointers, however long the list is &mdash; but to reach the hundredth item you must walk the ninety-nine before it.`
    ]},

    {t:"check",
      q:`A queue is held in ARRAY[1:4]. Four items join, then two leave, then two more join. Where are Front and Rear pointing, and how many items are in the queue?`,
      marks:4,
      a:`<p>Start: Front 1, Rear 1, Count 0. Four joins put Rear through 2, 3, 4 and then <strong>wrap to 1</strong>; Count is 4. Two leaves move Front to 3; Count is 2. Two more joins write at 1 and 2, moving Rear to 3; Count is 4.</p><p><strong>Front 3, Rear 3, Count 4.</strong> Front and Rear are equal and the queue is full &mdash; exactly the case the count exists to disambiguate.</p>`}
  ]
},

{
  id:"L16", levels:["a2"], title:"Recursion",
  blurb:"A routine that calls itself, the base case that stops it, and what it costs.",
  blocks:[
    {t:"p",html:`A <strong>recursive</strong> routine is one that calls itself. It is the natural way to write anything defined in terms of a smaller version of itself.`},
    {t:"p",html:`Every recursive routine needs exactly two things. Miss either and it is wrong.`},
    {t:"list",items:[
      `A <strong>base case</strong> &mdash; a condition under which it returns an answer <em>without</em> calling itself.`,
      `A <strong>general case</strong> &mdash; which calls itself on a <strong>smaller</strong> problem, so the base case is always eventually reached.`
    ]},

    {t:"code",src:
`FUNCTION Factorial(N : INTEGER) RETURNS INTEGER
    IF N <= 1 THEN
        RETURN 1                          // BASE CASE: no further call
    ELSE
        RETURN N * Factorial(N - 1)       // GENERAL CASE: smaller each time
    ENDIF
ENDFUNCTION

OUTPUT Factorial(5)`},

    {t:"h",text:"What actually happens"},
    {t:"p",html:`<em class="term">Factorial(5)</em> cannot return until <em class="term">Factorial(4)</em> does, which waits on <em class="term">Factorial(3)</em>, and so on down to <em class="term">Factorial(1)</em>, which returns 1 immediately. Only then do the multiplications happen, on the way back up: 1, then 2, 6, 24, 120.`},
    {t:"p",html:`Every unfinished call is held on the <strong>call stack</strong>, with its own copy of the parameters and local variables. The stack is what makes recursion work &mdash; and what makes it expensive.`},

    {t:"note",kind:"exam",label:"Stack overflow",label2:"",html:`<p>With no base case, nothing ever returns, the call stack keeps growing and the program crashes with a <strong>stack overflow</strong>. &ldquo;Why must a recursive routine have a base case?&rdquo; is answered with that sentence, not with &ldquo;so it stops&rdquo;.</p>`},

    {t:"h",text:"Recursion against iteration"},
    {t:"list",items:[
      `Recursion is <strong>shorter and closer to the definition</strong> for tree walks, divide-and-conquer searches, and anything self-similar.`,
      `Iteration uses <strong>less memory</strong>, because there is no stack of waiting calls, and is usually faster.`,
      `Anything written recursively can be written iteratively, and the other way round.`
    ]},
    {t:"p",html:`Here is the same calculation with a loop. Note that it needs an accumulator the recursive version did not.`},
    {t:"code",src:
`FUNCTION FactorialLoop(N : INTEGER) RETURNS INTEGER
    DECLARE Result, i : INTEGER

    Result <- 1
    FOR i <- 2 TO N
        Result <- Result * i
    NEXT i

    RETURN Result
ENDFUNCTION

OUTPUT FactorialLoop(5)`},

    {t:"check",
      q:`Write a recursive function that returns the sum of the digits of a positive whole number. SumDigits(472) should give 13.`,
      marks:5,
      a:`<p>The last digit is <em class="term">MOD(N, 10)</em>; the rest of the number is <em class="term">DIV(N, 10)</em>. A number below 10 is a single digit, which is the base case. Marks for: the header; a base case that does not recurse; MOD for the last digit; DIV to shrink the problem; adding the two together.</p>`,
      acode:`FUNCTION SumDigits(N : INTEGER) RETURNS INTEGER
    IF N < 10 THEN
        RETURN N                                   // base case
    ELSE
        RETURN MOD(N, 10) + SumDigits(DIV(N, 10))  // smaller each time
    ENDIF
ENDFUNCTION

OUTPUT SumDigits(472)`}
  ]
},

{
  id:"L17", levels:["a2"], title:"File organisation and access",
  blurb:"Serial, sequential and random files, hashing, and which one a question is really describing.",
  blocks:[
    {t:"p",html:`How records are <strong>organised</strong> in a file, and how they are <strong>accessed</strong>, are two different questions. Exam questions mix them deliberately.`},

    {t:"h",text:"Serial"},
    {t:"p",html:`Records are stored in the order they arrived, with no ordering by key. New records go on the end. To find one you must read from the start until you meet it.`},
    {t:"p",html:`Good for a transaction log, where arrival order <em>is</em> the information. Hopeless for looking anything up.`},

    {t:"h",text:"Sequential"},
    {t:"p",html:`Records are stored in order of a key field &mdash; by membership number, say. Still read from the start, but you can stop early once you pass where the record would have been.`},
    {t:"p",html:`Inserting is the price: a new record belongs in the middle, so the file is normally rebuilt by merging the new records into it.`},

    {t:"h",text:"Random"},
    {t:"p",html:`Each record has an <strong>address</strong> in the file, calculated from its key, so a record is reached directly without reading anything before it. This is the only organisation that gives fast access to one record in a large file.`},
    {t:"code",src:
`TYPE StockItem
    DECLARE Code : STRING
    DECLARE Quantity : INTEGER
ENDTYPE

DECLARE Item : StockItem

OPEN "Stock.dat" FOR RANDOM

SEEK "Stock.dat", 12                  // go straight to record 12
GETRECORD "Stock.dat", Item

Item.Quantity <- Item.Quantity - 1

SEEK "Stock.dat", 12                  // reading moved the position: go back
PUTRECORD "Stock.dat", Item

CLOSEFILE("Stock.dat")`},
    {t:"note",kind:"warn",label:"SEEK twice",html:`<p>Reading a record moves the file position past it. If you read a record, change it and write it back, you must <em class="term">SEEK</em> again before <em class="term">PUTRECORD</em> &mdash; otherwise you overwrite the record <em>after</em> the one you meant.</p>`},

    {t:"h",text:"Hashing"},
    {t:"p",html:`The address comes from a <strong>hashing algorithm</strong> applied to the key: a calculation turning a key into a record number inside the file. A simple one takes the remainder after dividing by the file size.`},
    {t:"code",src:
`FUNCTION Hash(Key : INTEGER) RETURNS INTEGER
    CONSTANT FileSize = 500
    RETURN MOD(Key, FileSize) + 1      // + 1 because addresses start at 1
ENDFUNCTION

OUTPUT Hash(4071)`},
    {t:"p",html:`Two different keys can hash to the same address. That is a <strong>collision</strong>, and it is not a flaw to be designed away &mdash; it is expected. The usual answer is to put the record in the next free address after the one calculated, and when searching, to carry on from the calculated address until the record or an empty slot is found.`},

    {t:"note",kind:"exam",label:"Reading the question",html:`<p>&ldquo;Find one customer's record quickly in a file of 50,000&rdquo; is random access. &ldquo;Produce a report of every customer in account-number order&rdquo; is sequential. &ldquo;Record every transaction as it happens&rdquo; is serial. The question names the <em>task</em> and expects you to name the organisation.</p>`},

    {t:"check",
      q:`A library has 20,000 member records. Members are looked up constantly by membership number, and once a month every member is printed in number order. State which file organisation you would use and justify it in two sentences.`,
      marks:4,
      a:`<p><strong>Random (direct) access</strong>, with the address found by hashing the membership number.</p><p>Marks for: naming random access; because a single lookup reaches the record directly rather than reading up to 20,000 records; noting that the monthly report can still be produced by reading every address in order, or by sorting a copy; and recognising that the frequent operation should be the fast one.</p>`}
  ]
},

{
  id:"L18", levels:["a2"], title:"Exception handling",
  blurb:"Catching what goes wrong at run time instead of letting the program die.",
  blocks:[
    {t:"p",html:`An <strong>exception</strong> is an unexpected event at run time that stops a program doing what it was told &mdash; a file that is not there, text where a number was expected, a division by zero.`},
    {t:"p",html:`<strong>Exception handling</strong> is responding to it inside the program, so it carries on sensibly or shuts down tidily, instead of crashing in front of the user.`},

    {t:"h",text:"What counts as an exception"},
    {t:"list",items:[
      `Opening a file that does not exist.`,
      `Converting <em class="term">"hello"</em> to a number.`,
      `Dividing by a count that turned out to be zero.`,
      `Indexing outside an array.`,
      `Running out of memory or disk space.`
    ]},
    {t:"p",html:`Notice what is <em>not</em> on that list: a user typing a mark of 150. That is invalid data, and it is caught by <strong>validation</strong> &mdash; a range check you wrote on purpose. Exceptions are for what you could not reasonably test for in advance.`},

    {t:"note",kind:"exam",label:"Validation or exception handling?",html:`<p>This distinction is the question. <strong>Validation</strong> checks data <em>before</em> using it, and is normal control flow. <strong>Exception handling</strong> deals with a failure <em>as it happens</em>, in code that would otherwise stop. Prefer validation where you can: it is cheaper and clearer. Use exception handling for what validation cannot see coming.</p>`},

    {t:"h",text:"The shape"},
    {t:"p",html:`In a real language this is <em class="term">try</em> / <em class="term">except</em> or <em class="term">try</em> / <em class="term">catch</em>: a block of code that might fail, and a handler that runs only if it does. The 9618 pseudocode has no exception syntax of its own, so an algorithm answer shows the <em>intent</em> &mdash; guard the risky operation and give the program a sensible way out.`},
    {t:"code",src:
`DECLARE Line : STRING
DECLARE Value, Total : INTEGER
DECLARE Rejected : INTEGER

Total    <- 0
Rejected <- 0

OPEN "Readings.txt" FOR READ

WHILE NOT EOF("Readings.txt") DO
    READFILE "Readings.txt", Line

    IF IS_NUM(Line) THEN                  // guard before converting
        Value <- STRING_TO_NUM(Line)
        Total <- Total + Value
    ELSE
        Rejected <- Rejected + 1          // handle it, do not stop
        OUTPUT "Skipped a line that was not a number: ", Line
    ENDIF
ENDWHILE

CLOSEFILE("Readings.txt")

OUTPUT "Total ", Total, " from the valid lines, ", Rejected, " skipped"`},
    {t:"p",html:`One bad line in a thousand does not lose the other nine hundred and ninety-nine. That is the whole idea.`},

    {t:"h",text:"Why it matters"},
    {t:"list",items:[
      `The program stays usable instead of stopping dead.`,
      `Work already done is not lost &mdash; files get closed, totals get written.`,
      `The user gets a message they can act on, rather than a crash.`,
      `The error is recorded, so it can be found and fixed later.`
    ]},

    {t:"check",
      q:`A program reads a file of prices and divides the total by the number of prices to get a mean. Name two things that could go wrong at run time, and say how you would handle each.`,
      marks:4,
      a:`<p>Marks for any two, with a handling step for each:</p><ul>
<li><strong>The file does not exist</strong> &mdash; check before opening, or handle the failure and tell the user which file is missing rather than crashing.</li>
<li><strong>A line is not a number</strong> &mdash; test it with <em class="term">IS_NUM</em> before converting, and skip or report that line.</li>
<li><strong>The file is empty, so the count is zero</strong> &mdash; guard the division with <em class="term">IF Count &gt; 0 THEN</em> and report that there was nothing to average.</li>
</ul>`}
  ]
}

];
