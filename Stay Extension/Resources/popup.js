var __b; if (typeof browser != "undefined") {__b = browser;} if (typeof chrome != "undefined") {__b = chrome;}
var browser = __b;
/**
 * String原型对象方法
 * 将字符串的true/false 转为boolean基本数据类型
 * @returns boolean
 */
String.prototype.bool = function () {
    return (/^true$/i).test(this);
}
Object.prototype.hide = function () {
    this.style.display = "none"
}
Object.prototype.show = function () {
    this.style.display = "block"
}
Object.prototype.cleanInnerHTML = function () {
    this.innerHTML = "";
}
Object.prototype.setInnerHtml = function (value) {
    this.innerHTML = value
}

let browserRunUrl = "",
    scriptStateList = [],
    scriptStateListDom,
    logNotifyDom,
    scriptConsole = [],
    showLogNotify = false,
    logIsFetched = false,
    scriptConsoleDom,
    scriptDomTmp = [
            '<div class="info-case">',
            '<div class="title">{name}<span>{status}</span></div>',
            '<div class="name">{author}</div>',
            '<div class="desc">{description}</div>',
            '</div>',
            '<div class="active-case" active={active} uuid={uuid} >',
            '<div class="active-icon" active={active} uuid={uuid} ></div>',
            '</div>'].join(''),
    scriptState = ['start', 'stop'],
    scriptLogDomTmp = [
            '<div class="console-header">',
            '<div class="console-time">{time}</div>',
            '<div class="console-name">{name}</div>',
            '</div>',
            '<div class="console-con">{message}</div>'
            ].join(''),
    logState = {error:"error-log", log:""};


//https://stackoverflow.com/questions/26246601/wildcard-string-comparison-in-javascript
//Short code
function matchRule(str, rule) {
  var escapeRegex = (str) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  return new RegExp("^" + rule.split("*").map(escapeRegex).join(".*") + "$").test(str);
}


const matchesCheck = (userLibraryScript, url) => {
    let matched = false;
    userLibraryScript.matches.forEach((match) => { //check matches
        let matchPattern = new window.MatchPattern(match);
        if (matchPattern.doMatch(url)) {
            matched = true;
        }
    });
    if (matched) {
        if (userLibraryScript.includes.length > 0) {
            matched = false;
            userLibraryScript.includes.forEach((include) => {
                if (matchRule(url.href,include)) {
                    matched = true;
                }
            });
        }
        userLibraryScript.excludes.forEach((exclude) => {
            if (matchRule(url.href,exclude)) {
                matched = false;
            }
        });
    }

    return matched;
}

/**
 * 获取当前网页可匹配的脚本
 */
function fetchMatchedScriptList(){
    browser.tabs.getSelected(null, (tab) => {
        browserRunUrl = tab.url;
        browser.runtime.sendMessage({ from: "bootstrap", operate: "fetchScripts" }, (response) => {
            try{
                let userLibraryScripts = JSON.parse(response.body);
                userLibraryScripts.forEach((userLibraryScript) => {
                    let urlParse = new URL(browserRunUrl)
                    if (matchesCheck(userLibraryScript, urlParse)) {
                        scriptStateList.push(userLibraryScript);
                    }
                });
                renderScriptContent(scriptStateList);
                fetchMatchedScriptConsole();

            }catch(e){
                console.log(e);
            }
            
        });
    });
}

/**
 * 获取控制台日志并渲染
 */
function fetchAndRenderConsoleLog(){
    if (!logIsFetched){
        fetchMatchedScriptConsole()
    }
    renderScriptConsole(scriptConsole);
}


function fetchMatchedScriptConsole(){
    browser.runtime.sendMessage({ from: "popup", operate: "fetchMatchedScriptLog" }, (response) => {
        logIsFetched = true;
        if (response && response.body && response.body.length > 0) {
            response.body.forEach(item => {
                if (item.logList && item.logList.length > 0) {
                    item.logList.forEach(logMsg => {
                        let logType = logMsg.msgType ? logMsg.msgType : "log"
                        let dateTime = logMsg && logMsg.time ? logMsg.time : ""
                        let data = {
                            uuid: item.uuid,
                            name: item.name,
                            time: dateTime,
                            //Fixed wrong variable logMsg.
                            msgType: logType,
                            message: logMsg.msg
                        };
                        scriptConsole.push(data)
                    })
                }
            })
            if (!showLogNotify && scriptConsole.length>0) {
                showLogNotify = true
                logNotifyDom.show()
                let count = scriptConsole.length
                count = count>99?"99+":count
                logNotifyDom.setInnerHtml(count)
            }

        } else {
            scriptConsole = [];
        }
    })
}

/**
 * 匹配脚本为空的样式状态
 */
function showNullData(message){
    scriptStateListDom.hide()
    var _dom = document.getElementById("dataNull");
    _dom.setInnerHtml(message || "未匹配到可用脚本");
    _dom.show();
}

window.onload=function(){
    let self = this;
    logNotifyDom = document.getElementById("logNotify")
    scriptStateListDom = document.getElementById('scriptSateList');
    scriptConsoleDom = document.getElementById('scriptConsole');
    fetchMatchedScriptList()
    
    // 给header tab绑定事件
    document.querySelector(".header-box .header-tab").addEventListener("click", function(e){
        let target = e.target;
        if(target){
            let type = target.getAttribute("tab");
            handleTabAction(target, type);
        }
    })
    
    // 给scriptStateListDom添加监听器
    scriptStateListDom.addEventListener("click", function (e) {
        let target = e.target;
        // e.target是被点击的元素!
        // 筛选触发事件的子元素如果是active-case执行的事件
        if (target && target.nodeName.toLowerCase() == "div" && (target.className.toLowerCase() == "active-case" || target.className.toLowerCase() == "active-icon")) {
            // 获取到具体事件触发的active-case，进行active
            let active = target.getAttribute("active");
            let uuid = target.getAttribute("uuid");
            console.log("active= ", active, ", uuid=", uuid, ", was clicked!");
            handleScriptActive(uuid, active.bool());
            return;
        }
    });
};

/**
 * String原型对象方法
 * 将字符串的true/false 转为boolean基本数据类型
 * @returns boolean
 */
String.prototype.bool = function () {
    return (/^true$/i).test(this);
};

/**
 * 匹配脚本的控制台数据绑定及渲染
 * @param {Array} datas   匹配脚本的控制台数据
 */
function renderScriptConsole(datas) {
    const scriptLogList = datas;
    scriptConsoleDom.cleanInnerHTML();
    if(scriptLogList && scriptLogList.length>0){
        scriptConsoleDom.show()
        scriptLogList.forEach(item=> {
            let data = item
            let logType = data.msgType ? data.msgType : "log"
            var _dom = document.createElement('div');
            _dom.setAttribute('class', 'console-item ' + logState[logType]);
            _dom.setAttribute('uuid', data["uuid"]);
            _dom.innerHTML = scriptLogDomTmp.replace(/(\{.+?\})/g, function ($1) { return data[$1.slice(1, $1.length - 1)] });
            scriptConsoleDom.appendChild(_dom);
        })
        if (scriptConsoleDom.children.length == 0){
            scriptConsoleDom.hide();
        }
    }else{
        scriptConsoleDom.hide();
    }
}

/**
 * 匹配脚本的数据绑定及渲染
 * @param {Array} datas   匹配脚本数据
 */
function renderScriptContent(datas) {
    const scriptList = datas;
    scriptStateListDom.cleanInnerHTML();
    if (scriptList && scriptList.length>0){
        scriptStateListDom.show()
        document.getElementById("dataNull").hide()
        scriptList.forEach(function (item, idnex, array) {
            var data = item; 
            data.status = item.active ? "运行中" : "已停止"
            var _dom = document.createElement('div');
            let index = data.active ? 1 : 0;
            _dom.setAttribute('class', 'content-item ' + scriptState[index]);
            _dom.setAttribute('uuid', data["uuid"]);
            _dom.setAttribute('author', data["author"]);
            _dom.innerHTML = scriptDomTmp.replace(/(\{.+?\})/g, function ($1) { return data[$1.slice(1, $1.length - 1)] });
            scriptStateListDom.appendChild(_dom);
        })
    }else{
        showNullData("未匹配到可用脚本");
    }
}

/**
 * 控制脚本是否运行
 * @param {string}   uuid        脚本id
 * @param {boolean}  active      脚本当前可执行状态
 */
function handleScriptActive(uuid, active) {
    if (uuid && uuid != "" && typeof uuid == "string") {
        browser.runtime.sendMessage({
            from: "popup",
            operate: "setScriptActive",
            uuid: uuid,
            active: !active
        }, (response) => {
            console.log("setScriptActive response,",response)
        })
        // 改变数据active状态
        scriptStateList.forEach(function (item, index) {
            if(uuid == item.uuid){
                item.active = !active
            }
        })
        renderScriptContent(scriptStateList)
    }
}


/**
 * tab切换点击事件
 * @param {object} target   被点击的元素
 * @param {number} type     1:match,2:console
 **/
function handleTabAction(target, type) {
    if (typeof type != "undefined" && type > 0) {
        document.getElementsByClassName("active-tab")[0].classList.remove("active-tab"); // 删除之前已选中tab的样式
        target.classList.add('active-tab'); // 给当前选中tab添加样式
        if(type == 1){
            scriptStateListDom.show();
            scriptConsoleDom.hide();
        }else{
            showLogNotify = false;
            logNotifyDom.hide()
            scriptStateListDom.hide();
            scriptConsoleDom.show();
            fetchAndRenderConsoleLog()
        }
    }
}
