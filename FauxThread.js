// FauxThread.js
function waitfor () { /*keyword placeholder */ };
function await () { /* keyword placeholder*/ };

(function ThreadClosure (namespace) {
    "use strict";
    
    var xEval = function (source) {
        var head = document.getElementsByTagName("head")[0];
        var script = document.createElement("script");
        script.text = "function _EXEC_() {\n " + source + "\n}\n";
        head.appendChild(script);
        var result = _EXEC_();
        head.removeChild(script);
        return result;
    };
    
    var xTrim = function (value) {
        return value.replace(/^\s+|\s+$/g,"");
    };
    
    var buildParamList = function (fn) {
        var fnString = String(fn);
        var params = [];
        fnString = xTrim(fnString);
        fnString = fnString.substring(8); //skip keyword function
        fnString = xTrim(fnString);
        fnString = fnString.substring(1); //skip the first "("
        fnString = fnString.substring(0,fnString.indexOf("\n"));
        fnString = fnString.substring(0,fnString.lastIndexOf(")")); // trim to the end of the signature.
        fnString = xTrim(fnString);
        params = fnString.split(",");
        for (var i = 0; i < params.length; i += 1) {
            params[i] = xTrim(params[i]);
        }
        return params;
    };
    
    var buildCodeArray = function (fn) {
        var fnStr = funcToString(fn);
        var codeLines = parseCodeLines(fnStr);
        var blockLines = parseBlocks(codeLines);
        var cleanLines = replaceBranchesAndLoops(blockLines);
        var endIfLines = insertEndIfs(cleanLines);

        debugDisplay(endIfLines);
       
        return endIfLines;
    };
    
    
    
    // debugDisplay
    //
    // takes an array of code Lines and displays them in a 
    // pop-up window. lines are numbered and provided in a 
    // textarea that fills the window.
    var debugDisplay = function (codeLines) {
        var ln = 0;
        var html = "<html><body><textarea style=\"position:absolute; top:0%; left:0%; width:100%; height:100%; \">{RESULTS}</textarea></body></html>";
        var htmlLines = "";
        var stringLineNum = "";
        var debugWindow;
        for (ln = 0; ln < codeLines.length; ln += 1) {
            stringLineNum = String(ln);
            while (stringLineNum.length < 4) {
                stringLineNum = "0" + stringLineNum;
            }
            htmlLines += stringLineNum + ": " + codeLines[ln] + "\n";
        }
        debugWindow = window.open("","win"+String(Math.random()).replace(".",""),"toolbar=no, scrollbars=yes, resizable=yes, top=64, left=64, width=640, height=480");
        html = html.replace("{RESULTS}",htmlLines);
        debugWindow.document.write(html);
        debugWindow.document.close();
    };


    
    // funcToString
    //
    // takes a function object and converts the function's
    // body into a string: Thus excluding the function's signature.
    var funcToString = function (fn) {
        var fnStr = String(fn);
        var openBrace = fnStr.indexOf("{") + 1;
        fnStr = fnStr.substring(openBrace);
        fnStr = fnStr.substring(0,fnStr.length-2);
        fnStr = xTrim(fnStr);
        fnStr = fnStr.replace(/\r/g,"");
        fnStr = fnStr.replace(/\t/g,"    "); 
        fnStr += "\n";
        return fnStr;
    };


    
    // parseCodeLines
    //
    // takes a function string (the result of funcToString)
    // and splits it by line into an array of strings.
    // empty lines, and lines begining with // are skipped
    var parseCodeLines = function (fnStr) {
        var rawLines = fnStr.split("\n");
        var currLine = "";
        var codeLines = [];
        for (var ln = 0; ln < rawLines.length; ln += 1) {
            currLine = rawLines[ln];
            currLine = xTrim(currLine);
            if (currLine.substring(0,2) !== "//" && currLine.length !== 0) {
                codeLines.push(currLine);
            }
        }
        return codeLines;
    };
    
    
    
    // parseBlocks
    //
    // takes a code-line array and converts open and closing 
    // curley braces. into this.BLOCK and this.ENDBLOCK. these 
    // psuedo keywords are seperated out on their own line.
    var parseBlocks = function (codeLines) {
        var blockLines = [];
        var blockLn = 0;
        var currLine = 0;
        var splitLines = [];
        var splitLn = 0;
        for (var codeLn = 0; codeLn < codeLines.length; codeLn += 1) {
            currLine = codeLines[codeLn];
            splitLines = splitOnBraces(currLine);
            for(splitLn = 0; splitLn < splitLines.length; splitLn += 1) {
                blockLines[blockLn] = splitLines[splitLn];
                blockLn += 1;
            }
        }
        return blockLines;
    };
    
    
    
    // splitOnBraces
    // 
    // takes a string representing a single line of code
    // and splits it up by open and close curley braces.
    // the braces are converted to this.BLOCK and this.ENDBLOCK
    // and are given a seperate slot in the array. 
    // this function is called from parseBlocks. This goal
    // here is to ensure that the loop and logic blocks are 
    // captured so the Thread can run properly. 
    var splitOnBraces = function(codeLine) {
        var i = 0;
        var c = "";
        var splitLines = [];
        var token = "";
        for(var i = 0; i < codeLine.length; i += 1) {
            c = codeLine.charAt(i);
            if (c === "{") {
                if(token.length > 0) {
                    splitLines.push(xTrim(token));
                    token = "";
                }
                splitLines.push("this.BLOCK();");
            } else if (c === "}") {
                if(token.length > 0) {
                    splitLines.push(xTrim(token));
                    token = "";
                }
                splitLines.push("this.ENDBLOCK();");
            } else {
                token += c;            
            }            
        }
        if (token.length > 0) {
            splitLines.push(xTrim(token));
            token = "";
        }
        return splitLines;
    };
    
    
    
    // replaceBranchesAndLoops
    //
    // takes an array of codelines and replaces the branch and loop
    // keywords with the associated threading pseudo keywords.
    var replaceBranchesAndLoops = function (codeLines) {
        var currLine = "";
        for (var ln = 0; ln < codeLines.length; ln += 1) {
            currLine = codeLines[ln];
            if(currLine.substring(0,2) === "if") {
                codeLines[ln] =  "this.IF" + currLine.substring(2);
            } else if (currLine.substring(0,7) === "else if") {
                codeLines[ln] = "this.ELSEIF" + currLine.substring(7); // <-- This order is important. else if must come before the 'else' check 
            } else if (currLine.substring(0,4) === "else") {
                codeLines[ln] = "this.ELSE();" + currLine.substring(4);
            } else if (currLine.substring(0,5) === "while") {
                codeLines[ln] = "this.WHILE" + currLine.substring(5);
            } else if (currLine.substring(0,5) === "break") {
                codeLines[ln] = "this.BREAK()";
            } else if (currLine.substring(0,5) === "await") {
                codeLines[ln] = "this.AWAIT" + currLine.substring(5);
            } else if (currLine.substring(0,7) === "waitfor") {
                codeLines[ln] = "this.WAITFOR" + currLine.substring(7);
            } else if (currLine.substring(0,3) === "var") {
                currLine = currLine.substring(3);
                currLine = xTrim(currLine);
                codeLines[ln] = "this." + currLine;
            }   
        }
        return codeLines;
    };
    
    
    
    // insertEndIfs
    //
    // takes an array of codelines and inserts 'this.ENDIF();' at
    // the end of an if/elseif/else block. this endif function is 
    // necessary to ensure that the thread's "if-stack" does not
    // overflow.
    var insertEndIfs = function (codeLines) {
        var ln = 0;
        var currLine = "";
        var nextLine = "";
        var count = 0;
        var newCodeLines = [];
        while (ln < codeLines.length) {
            currLine = codeLines[ln];
            newCodeLines.push(currLine);
            if (currLine.substring(0,7) === "this.IF") {
                count = 1;
                ln += 1; //skip past the first block
                newCodeLines.push(codeLines[ln]);
                while(true) {
                    ln += 1;
                    if (ln === codeLines.length) {
                        break;
                    }
                    currLine = codeLines[ln];
                    nextLine = codeLines[ln+1] || "";
                    newCodeLines.push(currLine);                    
                    if (currLine.substring(0,7) === "this.IF" && nextLine === "this.BLOCK();") {
                        count += 1;
                    } else if (currLine === "this.ENDBLOCK();") {
                        if (nextLine.substring(0,9) !== "this.ELSE" && nextLine.substring(0,11) !== "this.ELSEIF") {
                            count -= 1;
                        } else if ( ln === codeLines.length-1) {
                            //else if we're at the end of the function body.
                            count -= 1;
                        }
                    }
                    if (count === 0 ) {
                        newCodeLines.push("this.ENDIF();");
                        break;
                    }
                }
            }
            ln += 1;
        }
        return newCodeLines;
    };
    
    // ******************************************************************************************************************************************* 
    

    var FauxThread = function (fn) {
        this.code = buildCodeArray(fn);
        this.blockStack = [];
        this.elseifStack = [];
        this.pos = 0;
        this.paramList = buildParamList(fn);
        this.timeoutRef = {};
        this.iterFunc = {};
        this.running = false;
        var threadObject = this;
        var threadWrapper = function () {
            var args = Array.prototype.slice.call(arguments, 0);
            for(var i = 0; i < threadObject.paramList.length; i += 1) {
                threadObject[threadObject.paramList[i]] = args[i];
            }
            //the call the function!
            threadObject.start();
        };
        threadWrapper.Thread = threadObject;
        return threadWrapper;
    };

    FauxThread.prototype.run = function () {
        //dynamically assigned during runtime.
    };


    FauxThread.prototype.IF = function (cond) {
        var count = 1;
        var codeLine = "";
        if (! cond) {
            this.elseifStack.push(1);
            this.pos += 1; //skip the first this.BLOCK();
            this.BREAK();
        } else {
            this.elseifStack.push(0);
            // let the system know that when you pop,
            // you're not looping back to the begining.
            this.blockStack.push(-1024);
           //do nothing, continue to next statement
           
        }
    };
    
    FauxThread.prototype.ELSE = function () {
        var elseStatus = this.elseifStack[this.elseifStack.length-1];
        if (elseStatus === 0) {
            this.pos += 1; //skip the first this.BLOCK();
            this.BREAK();
        } else {
            this.blockStack.push(-1024);
        }
    };
    
    FauxThread.prototype.ELSEIF = function (cond) {
        var count = 1;
        var codeLine = "";
        var elseStatus = this.elseifStack[this.elseifStack.length-1];
        if (elseStatus === 0) {
            this.pos += 1; //skip the first this.BLOCK();
            this.BREAK();
        } else {
            if (! cond) {
                this.pos += 1; //skip the first this.BLOCK();
                this.BREAK();
            } else {
                this.elseifStack[this.elseifStack.length-1] = 0;
                // let the system know that when you pop,
                // you're not looping back to the begining.
                this.blockStack.push(-1024);
               //do nothing, continue to next statement
            }
        }
    };
    
    FauxThread.prototype.ENDIF = function () {
        this.elseifStack.pop();
    };
    
    FauxThread.prototype.WHILE = function (cond) {
        var codeLine = "";
        var count = 1;
        if (! cond) {
            //skip the first this.BLOCK();
            this.pos += 1;
            this.BREAK();
        } else {
            //condition is met , push the while location to the stack
            this.blockStack.push(this.pos-1);
            //look ahead for the start of the block, and then
            //advance the position
            if (this.code[this.pos+1] === "this.BLOCK();") {
                this.pos += 1;
            } else {
                throw("[THREAD ERROR]: Missing this.BLOCK(); ");
            }
        }
    };

    FauxThread.prototype.BLOCK = function () {
        //empty function
    };
    
    FauxThread.prototype.ENDBLOCK = function () {
        var oldPos = this.blockStack.pop();
        if (oldPos !== -1024) {
            this.pos = oldPos;
        }
    };

    FauxThread.prototype.BREAK = function () {
        var codeLine = "";
        var count = 1;
        while (true) {
            this.pos += 1;
            if (this.pos >= this.code.length) {
                throw("[THREAD ERROR]: Missing this.ENDBLOCK();");
            }
            codeLine = this.code[this.pos];
            codeLine = xTrim(codeLine);
            if (codeLine.substring(0,13) === "this.BLOCK();") {
                count += 1;
            } else if (codeLine.substring(0,16) === "this.ENDBLOCK();") {
                count -= 1;
            }
            if (count == 0) {
                break; //while loop
            }
        }
    };
    
    FauxThread.prototype.WAITFOR = function (val) {
        try {
            if (val === false) {
                this.pos -= 1;
            } else {
                var test1 = 0;
            }
        } catch (er) {
            this.pos -= 1;
        }
    };

    FauxThread.prototype.AWAIT = function (xmlhttp) {
        try {
            if (! (xmlhttp.readyState == 4 && xmlhttp.status == 200) ) {
                this.pos -= 1;
            }
        } catch (er) {
            this.pos -= 1;
        }
    };

    FauxThread.prototype.getThreadToLocalContext = function () {
        var contextScript = "";
        var internalProps = "[code][blockStack][pos][paramList][intervalObject][running][freq][elseifStack][iterFunc][timeoutRef]";
        for(var v in this) {
            if (this.hasOwnProperty(v) ) {
                if (internalProps.indexOf(v) === -1) {              
                    contextScript += "var " + v + " = this." + v + ";\n";
                }
            }
        }
        return contextScript;
    };

    FauxThread.prototype.getLocalToThreadContext = function () {
        var contextScript = "";
        var internalProps = "[code][blockStack][pos][paramList][intervalObject][running][freq][elseifStack][iterFunc][timeoutRef]";
        for(var v in this) {
            if (this.hasOwnProperty(v) ) {
                if (internalProps.indexOf(v) === -1) {
                    contextScript += "this." + v + " = " + v + ";\n";
                }
            }
        }
        return contextScript;
    };


    FauxThread.prototype.start = function (freq) {            
        var thread = this;        
        if (thread.running === false) {        
            clearInterval(thread.timeoutRef);        
            thread.freq = freq || 1;
            thread.pos = 0;
            thread.blockStack = [];
            thread.running = true;    
            thread.iterFunc = function () {
                if (thread.running === true) {
                    var toLocal = thread.getThreadToLocalContext();
                    var fromLocal = thread.getLocalToThreadContext();
                    if (thread.pos >= thread.code.length) {
                        clearInterval(thread.timeoutRef);
                        thread.running = false;
                    } else {
                        try {
                            thread.run = xEval("return function(activeThread){\nactiveThread.run=function () { \n " + toLocal + "\n\n" +  thread.code[thread.pos] + "\n\n" + fromLocal + "\n}\n activeThread.run()\n}\n");
                            thread.run(thread);
                            thread.pos += 1;
                            thread.timeoutRef = setTimeout(thread.iterFunc, thread.freq);
                        } catch (er) {
                            clearInterval(thread.timeoutRef);
                            thread.running = false;
                            throw("[THREAD ERROR]: Active Thread Run error '" + thread.code[thread.pos] + "' ERRMSG:" + er.message);
                        }
                    }
                }
            };
            setTimeout(thread.iterFunc, thread.freq);
        }
    };

    namespace.FauxThread = FauxThread;

} (window));
