var pghelper = (function(listener) {
    var pages = [];
    var page = -1;
    
    function init_pages() {
        var container = $("[data-jojo='app-pages']");
        var back = $(container.children()[0]);
        var forward = $(container.children()[container.children().length - 1]);
        var pgli = container.children("li").slice(1, container.children().length - 1);
        
        console.log(pgli);
        
        for(var i = 0; i < pgli.length; i++) {
            li = $(pgli[i]);
            var __a = $(li.children("a")[0]);
            var dis = li.hasClass("disabled");
            pages.push({
                "li": li,
                "a": __a,
                "disabled": dis
            });

            // Fixes some scope issues.
            (function(mi, disable) {
                __a.click(function(e) {
                    if(!disable) __setpage(mi);
                    e.preventDefault();
                });
            })(i, dis);
        }

        back.click(function(e) {__pgprev(); e.preventDefault();});
        forward.click(function(e) {__pgnext(); e.preventDefault();});

        __setpage(0);
    }
    
    function __pgnext() {
        __setpage(page + 1, true);
    }
    
    function __pgprev() {
        __setpage(page - 1, false);
    }
    
    function __setpage(p, f) {
        if(p < 0) p = pages.length - 1;
        if(p >= pages.length) p = 0;
        if(pages[p]) {
            while(pages[p].disabled) { __setpage(p + (f ? 1 : -1)); return; }
            last = page;
            page = p;
            var opage = pages[page];
            var opagename = opage.a.attr("href").substr(1);
            window.location.hash = opagename;
            if(pages[last] != pages[page]) {
                if(pages[last]) {
                    pages[last].li.removeClass("active");
                    var lid = pages[last].a.attr("href");
                    $(lid).css("display", "none");
                    $(lid).css("visibility", "hidden");
                }
                pages[page].li.addClass("active");
                var id = pages[page].a.attr("href");
                $(id).css("display", "block");
                $(id).css("visibility", "visible");
                if(listener) listener(opagename);
            }
        }
    }
    
    init_pages();

    return {
        "nextpg": __pgnext,
        "prevpg": __pgprev,
        "setpg": __setpage
    };
});

$(function() {
    var page = null;
    var jsoneditor = ace.edit("json-input-editor");
    var javaeditor = ace.edit("java-output-editor");
    var topclass = null;
    var varscopes = "private";
    var numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    var JavaClass = (function() {
        function JavaClass(par, __name, obj, toppar) {
            if(!toppar) {
                this.toppar = this;
                this.__classes = [];
                this.__classhashes = {};
                this.inner = false;
            } else {
                this.toppar = toppar;
                this.toppar.__classes.push(this);
                this.inner = true;
            }
            this.par = par;
            this.__name = __name;
            this.obj = obj;
            this.__hash = this.getObjectTypeHash(this.obj);
            this.variables = [];
            this.process();
        }

        JavaClass.prototype.getName = function() {
            if(this.par) {
                var pname = this.par.getName();
                if(pname) return pname + "__" + this.__name;
                else return "__" + this.__name;
            } else {
                return this.__name;
            }
        }

        JavaClass.prototype.process = function() {
            var k;
            for(k in this.obj) {
                var vtype = this.getVarType(k, this.obj[k]);
                var vname = k;
                if(vname[0] in numbers) vname = "_" + vname;
                if(vtype) this.variables.push({name: vname, type: vtype, par: this});
            }
        }

        JavaClass.prototype.getVarType = function(k, v) {
            if(v == null) return null;
            if(typeof v === "object") {
                if(v instanceof Array) return this.arrayType(k, v) + "[]";
                else return this.spawnClass(k, v);
            } else if(typeof v === "number") {
                if(v && v.toString().indexOf('.') === -1) return "int";
                else return "double";
            } else if(typeof v === "boolean") {
                return "boolean";
            } else if(typeof v === "string") {
                return "String";
            }
        }

        JavaClass.prototype.spawnClass = function(name, obj) {
            var hash = this.getObjectTypeHash(obj);
            if(this.toppar.__classhashes[hash]) return this.toppar.__classhashes[hash]
            var __class = new JavaClass(this, name, obj, this.toppar);
            this.toppar.__classhashes[hash] = __class;
            return __class;
        }

        JavaClass.root = function(obj) {
            return new JavaClass(null, null, obj, null);
        }

        JavaClass.prototype.arrayType = function(k, v) {
            var o;
            var curtype = null;
            var i = 0;
            for(o in v) {
                var otype = this.getVarType(k + "__index_" + (++i), v[o]);
                if(curtype != null) {
                    if(curtype != otype) return "Object";
                } else {
                    curtype = otype;
                    console.log("switching to: " + otype);
                }
            }
            return (curtype instanceof JavaClass ? "%(" + curtype.__hash + ")" : curtype);
        }

        JavaClass.prototype.getObjectTypeHash = function(v) {
            var prop;
            var str = "";
            for(prop in v) {
                if(str.length > 0) str += ",";
                str += prop;
            }
            return "{" + str + "}";
        }

        JavaClass.prototype.hashType = function(v) {
            if(v == null) return null;
            if(typeof v === "object") {
                if(v instanceof Array) return this.arrayType(v);
                else return this.getObjectTypeHash(v);
            } else if(typeof v === "number") {
                if(v && v.toString().indexOf('.') === -1) return "int";
                else return "double";
            } else if(typeof v === "boolean") {
                return "boolean";
            } else if(typeof v === "string") {
                return "String";
            } else {
                return typeof v;
            }
        }

        return JavaClass;
    })();

    function init() {
        jsoneditor.setTheme("ace/theme/monokai");
        jsoneditor.getSession().setMode("ace/mode/json");
        jsoneditor.session.setUseWorker(false);
        page = pghelper(pchange);
        // jsoneditor.setValue("{\r\n\t\"firstName\": \"John\",\r\n\t\"lastName\": \"Smith\",\r\n\t\"address\": {\r\n\t\t\"streetAddress\": \"21 Jump Street\",\r\n\t\t\"city\": \"New York\"\r\n\t}\r\n}");
        jsoneditor.focus();


        javaeditor.setTheme("ace/theme/monokai");
        javaeditor.getSession().setMode("ace/mode/java");
        javaeditor.session.setUseWorker(false);
        javaeditor.setReadOnly(true);
    }

    function mkclasses() {
        var obj = eval( "(" + jsoneditor.getValue() + ")" );
        topclass = JavaClass.root(obj);
        console.log(topclass);
    }

    function escapeRegExp(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }

    function mkjava() {
        varscopes = $("#variablescopes").val();
        var topname = $("#toplevelclass").val();
        if(!topname || topname.trim().length < 1) {
            alert("Please set a top level class name.");
            page.setpg(1);
            return;
        }
        topclass.__name = topname;

        var java = c2j(topclass, false);

        java += "\n";

        var c;

        for(c in topclass.__classes) {
            java += __tab( c2j(topclass.__classes[c]) ) + "\n";
        }

        java += "}";

        for(c in topclass.__classes) {
            c = topclass.__classes[c];
            java = java.replace(new RegExp(escapeRegExp("%(" + c.__hash + ")"), "g"), c.getName());
        }

        javaeditor.setValue(java);
    }

    // function escapeRegExp(string) {
    //     return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    // }

    // function replaceAll(string, find, replace) {
    //     return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
    // }

    function __tab(t) {
        t = "\t" + t;
        return t.replace(/(\n)(\t|[^\n])/g, "\n\t$2");
    }

    // Get the type name for a variable.
    function typename(v) {
        return (typeof v.type === "string" ? v.type : v.type.getName());
    }

    // class to java
    function c2j(c, close) {
        console.log(c);
        var t = "";
        t += "public " + (c.inner ? "static " : "") + "class ";
        t += c.getName() + " {";
        t += "\n";

        var v;
        for(v in c.variables) {
            v = c.variables[v];
            var tname = typename(v);
            t += "\t" + (varscopes && varscopes.trim().length > 0 ? varscopes + " " : "") + tname + " " + v.name + ";\n";
        }

        t += "\n"

        for(v in c.variables) {
            v = c.variables[v];
            t += __tab(genGetter(v)) + "\n";
        }

        if(close === undefined || close) t += "}";

        return t;
    }

    function uppercaseFirst(str) {
        return str[0].toUpperCase() + str.substr(1);
    }

    // Generate a getter for a variable.
    function genGetter(v) {
        var t = "public " + typename(v) + " " + "get" + uppercaseFirst(v.name) + "() {";
        t += "return this." + v.name + ";";
        t += "}";
        return t;
    }

    function pchange(p) {
        switch(p) {
            case "json-input":
                topclass = null;
                break;
            case "edit-classes":
                mkclasses();
                break;
            case "java-output":
                mkclasses();
                mkjava();
                javaeditor.focus();
                break;
        }
    }

    window.__edit_classes_submit = function() {
        page.setpg(2); // Set it to the java page.
    }

    init();
});

$('[data-toggle="tooltip"]').tooltip();