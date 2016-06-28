/**
 * ViewModel
 * @author ydr.me
 * @create 2016-05-01 01:06
 */


'use strict';

var Events = require('blear.classes.events');
var Template = require('blear.classes.template');
var Watcher = require('blear.classes.watcher');
var selector = require('blear.core.selector');
var attribute = require('blear.core.attribute');
var modification = require('blear.core.modification');
var event = require('blear.core.event');
var morphDom = require('blear.shims.morphdom');
var object = require('blear.utils.object');
var array = require('blear.utils.array');
var fun = require('blear.utils.function');
var string = require('blear.utils.string');
var random = require('blear.utils.random');
var typeis = require('blear.utils.typeis');
var collection = require('blear.utils.collection');
var access = require('blear.utils.access');


var win = window;
var doc = win.document;
var supportsEvents = 'change,input,click,dblclick,mouseenter,mouseleave,mouseover,mouseout,focusin,focusout,keydown,keypress,keyup'.split(',');
var gid = 0;
var NAMESPACE = 'viewModel';
var ELEMENT_NAME = '$el';
var EVENT_NAME = '$event';
var WATCH_PREFIX = NAMESPACE + '-watch-';
var EVENT_PROXY_ID_SPLIT = '/';
var VIEW_MODEL_SKIP = NAMESPACE + 'Skip';
var reMethods = /([a-z_$][\w$]*)(?:\((.*)\))?/i;
var reComma = /,/g;
var reArrayIndex = /\[(.*)]$/;
var reExp = /^\{\{(.+)}}$/;
var reString = /^['"]/;
// keyCode aliases
var keyCodes = {
    esc: [27],
    tab: [9],
    enter: [13],
    space: [32],
    up: [38],
    left: [37],
    right: [39],
    down: [40],
    'delete': [8, 46]
};
var defaults = {
    /**
     * 容器元素
     * @type HTMLElement|String|null
     */
    el: null,

    /**
     * 模板
     * @type String|null
     */
    template: null,

    /**
     * 数据
     * @type Object
     */
    data: {},

    /**
     * 方法
     * @type Object
     */
    methods: {},

    /**
     * 监听
     * @type Object
     */
    watches: {},

    /**
     * debounce 时间，单位 ms
     * @type Number
     */
    debounceTime: 10,

    /**
     * 指令前缀
     */
    directive: '@',

    /**
     * 是否调试模式，如果是，将插入 `debugger` 到编译后的函数内
     * @type Boolean
     */
    debug: false
};
var ViewModel = Events.extend({
    className: 'ViewModel',
    constructor: function (options) {
        var the = this;

        ViewModel.parent(the);

        // 防止 data 被重写
        the[_options] = options = object.assign(false, {}, defaults, options);
        the.el = the[_containerEl] = selector.query(options.el)[0];
        the[_instanceFilters] = {};

        if (!the[_containerEl]) {
            throw new TypeError('容器节点不存在');
        }

        var id = attribute.attr(the[_containerEl], NAMESPACE);

        if (id) {
            throw new TypeError('一个容器节点只允许实例化一次');
        }

        attribute.attr(the[_containerEl], NAMESPACE, gid++);

        the[_templateEl] = selector.query(options.template)[0];

        if (the[_templateEl]) {
            the[_template] = attribute.html(the[_templateEl]);
        } else if (options.template) {
            the[_template] = options.template;
        } else {
            the[_template] = attribute.html(the[_containerEl]);
        }

        the[_eventProxyMap] = {};
        the[_destroyed] = false;
        the[_reDirective] = new RegExp('^' + string.escapeRegExp(options.directive));
        the[_tpl] = new Template(the[_template], {
            methods: options.methods,
            debug: options.debug
        });
        the[_data] = options.data;
        the[_initProtection]();

        // 编译之前
        the[_tpl].on('beforeCompile', function (list) {
            list.push(the[_tpl].protectionName() + '.listeners = {};');
            list.push(the[_tpl].protectionName() + '.indexMap = {};');
        });

        // 初始化指令
        the[_initDirectiveEvent]();
        the[_initDirectiveModel]();
        the[_initDirectiveSkip]();

        // watches
        object.each(options.watches, function (key, callback) {
            the.watch(key, callback);
        });

        the.update();
        the[_watch]();
    },


    /**
     * 更新
     */
    update: function () {
        var the = this;
        var html = the[_tpl].render(the[_data], the[_protection]);

        morphDom(the[_containerEl], '<div>' + html + '</div>', {
            childrenOnly: true,
            onBeforeNodeDiscarded: function (fromNode, toNode) {
                if (fromNode.nodeType === 1) {
                    return !(attribute.hasAttr(fromNode, NAMESPACE) || attribute.hasAttr(fromNode, VIEW_MODEL_SKIP) );
                }
            }
        });
    },


    /**
     * 使用 vm 模式插入 DOM，该 DOM 不会被当前 view-model 管理
     * @param source
     * @param [target]
     * @param [position]
     * @returns {*}
     */
    insert: function (source, target, position) {
        var the = this;
        var args = access.args(arguments);

        switch (args.length) {
            case 1:
                target = the[_containerEl];
                break;

            case 2:
                if (typeis.String(args[1])) {
                    position = args[1];
                    target = the[_containerEl];
                }
                break;
        }

        var el = modification.insert(source, target, position);
        attribute.attr(el, VIEW_MODEL_SKIP, 'true');
        return el;
    },


    /**
     * 监听数据变化
     * @param key
     * @param callback
     * @returns {ViewModel}
     */
    watch: function (key, callback) {
        var the = this;

        the.on(WATCH_PREFIX + key, callback);

        return the;
    },


    /**
     * 获取数据
     * @returns {*}
     */
    data: function () {
        return this[_watcher].data();
    },


    /**
     * 销毁实例
     */
    destroy: function () {
        var the = this;

        the[_destroyed] = true;
        the[_data] = the.data();

        // 取消所有绑定的事件
        object.each(the[_eventProxyMap], function (proxyId, listener) {
            var type = proxyId.split(EVENT_PROXY_ID_SPLIT).shift();

            event.un(the[_containerEl], type, listener);
        });

        attribute.removeAttr(the[_containerEl], NAMESPACE);
        ViewModel.parent.destroy(the);
    }
});
var _options = ViewModel.sole();
var _instanceFilters = ViewModel.sole();
var _containerEl = ViewModel.sole();
var _templateEl = ViewModel.sole();
var _template = ViewModel.sole();
var _tpl = ViewModel.sole();
var _data = ViewModel.sole();
var _watcher = ViewModel.sole();
var _reDirective = ViewModel.sole();
var _initDirectiveEvent = ViewModel.sole();
var _initDirectiveModel = ViewModel.sole();
var _initDirectiveSkip = ViewModel.sole();
var _watch = ViewModel.sole();
var _addEventProxy = ViewModel.sole();
var _eventProxyMap = ViewModel.sole();
var _destroyed = ViewModel.sole();
var _initProtection = ViewModel.sole();
var _protection = ViewModel.sole();
var pro = ViewModel.prototype;


/**
 * 生成一个唯一的 vm id
 * @returns {string}
 */
var genVMId = (function () {
    var cid = 0;

    return function () {
        return '_vm_' + (cid++);
    };
}());


/**
 * 获取模型数据
 * @param el
 * @param ev
 * @returns {*}
 */
var getModelValue = function (el, ev) {
    var tagName = el.tagName;
    var type = el.type;
    var multiple = el.multiple;
    var name = el.name;
    var groupEls;
    var context = selector.closest(el, 'form')[0] || doc;
    var getGroupEls = function () {
        if (!name) {
            return [];
        }

        var els = selector.query('input', context);
        els = selector.filter(els, function (el) {
            return el.type === type && el.name === name && el.checked;
        });
        return els;
    };

    switch (tagName) {
        case 'INPUT':
            switch (type) {
                case 'checkbox':
                    groupEls = getGroupEls();

                    if (groupEls.length) {
                        // 数组
                        return array.map(groupEls, function (el) {
                            return el.value;
                        });
                    }
                    // 如果是单个那么就标记为 true/false
                    else {
                        return el.checked;
                    }

                case 'radio':
                    groupEls = getGroupEls();
                    return groupEls[0].value;

                default:
                    return el.value;
            }

        case 'TEXTAREA':
            return el.value;

        case 'SELECT':
            if (multiple) {
                var optionEls = selector.query('option', el);
                optionEls = selector.filter(optionEls, function (optionEl) {
                    return optionEl.selected;
                });
                return array.map(optionEls, function (optionEl) {
                    return optionEl.value;
                });
            } else {
                return el.value;
            }
    }
};


/**
 * 宽松的 inArray 操作
 * @param arr
 * @param val
 * @returns {boolean}
 */
var inArray = function (arr, val) {
    var found = false;

    if (!typeis.Array(arr)) {
        arr = [arr];
    }

    array.each(arr, function (index, _val) {
        if (String(val) === String(_val)) {
            found = true;
            return false;
        }
    });

    return found;
};


/**
 * 初始化保护数据
 */
pro[_initProtection] = function () {
    var the = this;
    var options = the[_options];

    // 用于存放受保护的数据，由当前内私有操作
    the[_protection] = {
        typeis: typeis,
        indexMap: {},
        listeners: {},
        /**
         * 获取模型值
         * @param el
         * @param ev
         * @returns {*}
         */
        getModelValue: getModelValue,

        /**
         * 判断是否在数组内
         * @param arr
         * @param val
         * @returns {boolean}
         */
        inArray: inArray,

        /**
         * 新建索引值
         * @param className
         */
        pushIndex: function (className) {
            if (typeis.Undefined(the[_protection].indexMap[className])) {
                the[_protection].indexMap[className] = 0;
            }
        },

        /**
         * 新增方法
         * @param className
         * @param listener
         */
        pushListener: function (className, listener) {
            the[_protection].listeners[className] = the[_protection].listeners[className] || [];
            the[_protection].listeners[className].push(listener);
        },

        /**
         * model change
         * @param key
         * @param val
         * @param el
         * @param ev
         */
        modelChange: function (key, val, el, ev) {
            the.emit('modelChange', key, val, el, ev);
        }
    };
};


/**
 * 初始化事件指令
 */
pro[_initDirectiveEvent] = function () {
    var the = this;
    // @event
    array.each(supportsEvents, function (index, type) {
        // onClick
        // onClick()
        // onClick(a)
        // onClick(a, b)
        // @click
        the[_tpl].directive(type, 10, function (vnode, directive) {
            var value = directive.value;
            var keyAlias = directive.filters[0];
            var keyCode;

            /* istanbul ignore next */
            if (keyAlias) {
                keyCode = keyCodes[keyAlias];

                if (!keyCode) {
                    throw new TypeError('不支持该别名：' + keyAlias);
                }
            }

            var tpl = this;
            var mathes = value.match(reMethods);
            var methodName = mathes[1];
            var args = (mathes[2] || '');
            var className = genVMId();
            var protectionName = tpl.protectionName();
            var dataName = tpl.dataName();
            var beforeList = [];
            var afterList = [];
            var condition = keyCode
                ? protectionName + '.inArray([' + keyCode + '], ' + EVENT_NAME + '.keyCode)'
                : 'true';

            beforeList.push(protectionName + '.pushIndex("' + className + '");');

            var argsList = args.split(reComma);
            argsList = array.map(argsList, string.trim);
            argsList = array.filter(argsList, string.trim);
            var closureArgsList = array.filter(argsList, function (item) {
                return item !== EVENT_NAME && item !== ELEMENT_NAME && !reString.test(item);
            });
            closureArgsList = array.map(closureArgsList, function (item) {
                return item.split('.')[0];
            });
            var closureArgs = closureArgsList.join(', ');

            if (argsList.length) {
                argsList.unshift('');
            }

            var callArgs = argsList.join(', ');

            beforeList.push(protectionName + '.pushListener("' + className + '", (function(' + closureArgs + ') {');
            beforeList.push('return function(' + ELEMENT_NAME + ', ' + EVENT_NAME + ') {');
            beforeList.push('  if (' + condition + ') {');
            beforeList.push('    ' + methodName + '.call(' + dataName + (callArgs) + ');');
            beforeList.push('  }');
            beforeList.push('}');
            beforeList.push('}(' + closureArgs + ')));');

            vnode.attrs['class'] = vnode.attrs['class'] || '';
            vnode.attrs['class'] += ' ' + className;
            vnode.attrs[className] = '{{(' + protectionName + '.indexMap.' + className + '++)}}';

            the[_addEventProxy](type, className);

            return [beforeList.join('\n'), afterList.join('\n')];
        });
    });
};


/**
 * 初始化模型指令
 */
pro[_initDirectiveModel] = function () {
    var the = this;
    // @model
    the[_tpl].directive('model', 10, function (vnode, directive) {
        var value = directive.value;
        var tpl = this;
        var dataName = tpl.dataName();
        var protectionName = tpl.protectionName();
        var className = genVMId();
        var paths = value.split('.');
        var contextName = paths.length > 1 ? paths.shift() : dataName;
        var fullName = contextName + '.' + paths.join('.');
        var indexName = '""';
        var parentName = fullName.replace(reArrayIndex, function (soure, _indexName) {
            indexName = _indexName;
            return '';
        });
        var beforeCode = ''.concat(
            protectionName + '.pushIndex("' + className + '");'
        );
        var valueName = tpl.genVarName();
        var afterCode = ''.concat(
            protectionName + '.pushListener("' + className + '", (function(' + contextName + ') {',
            /***/'return function(el, ev) {',
            /***//***/'var ' + valueName + ' = ' + protectionName + '.getModelValue(el, ev);',
            /***/ /***/'if (typeof ' + indexName + ' === "number" && ' + protectionName + '.typeis.Array(' + parentName + ')) {',
            /***//***//***/parentName + '.set(' + indexName + ', ' + valueName + ');',
            /***//***/'} else {',
            /***//***//***/fullName + ' = ' + valueName + ';',
            /***//***/'}',
            /***//***/protectionName + '.modelChange("' + fullName + '", ' + valueName + ', el, ev);',
            /***/'}',
            '}(' + contextName + ')));'
        );

        vnode.attrs['class'] = vnode.attrs['class'] || '';
        vnode.attrs['class'] += ' ' + className;

        // 设置值
        switch (vnode.tag) {
            case 'input':
                var attrValue = vnode.attrs.value;
                var isExp = Template.isExpression(attrValue);
                var exp;

                switch (vnode.attrs.type) {
                    case 'checkbox':
                        if (vnode.attrs.name) {
                            if (isExp) {
                                exp = the[_tpl].parseExpression(attrValue);
                                vnode.attrs.checked = '{{' + protectionName + '.inArray(' + value + ', String(' + exp + '))}}';
                            } else {
                                vnode.attrs.checked = '{{' + protectionName + '.inArray(' + value + ', String(' + attrValue + '))}}';
                            }
                        } else {
                            vnode.attrs.checked = '{{' + value + ' === true}}';
                        }
                        break;

                    case 'radio':
                        if (isExp) {
                            exp = the[_tpl].parseExpression(attrValue);
                            vnode.attrs.checked = '{{String(' + value + ') === String(' + exp + ')}}';
                        } else {
                            vnode.attrs.checked = '{{String(' + value + ') === String(' + attrValue + ')}}';
                        }
                        break;

                    default:
                        vnode.attrs.value = '{{' + value + '}}';
                        break;
                }
                break;

            case 'select':
                // 找到子级 option 并且将其设置值
                array.each(vnode.children, function (index, option) {
                    if (option.tag === 'option') {
                        var isExp = false;
                        var optionValue = option.attrs.value;

                        optionValue = optionValue.replace(reExp, function ($0, $1) {
                            isExp = true;
                            return $1;
                        });

                        if (!isExp) {
                            optionValue = '"' + optionValue + '"';
                        }

                        if ('multiple' in vnode.attrs) {
                            option.attrs.selected = '{{' + protectionName + '.inArray(' + value + ', ' + optionValue + ')}}';
                        } else {
                            option.attrs.selected = '{{String(' + value + ') === String(' + optionValue + ')}}';
                        }
                    }
                });

                vnode.attrs.value = '{{' + value + '}}';
                break;

            case 'textarea':
                vnode.children = [{
                    type: 'exp',
                    value: '=' + value
                }];
                break;
        }

        vnode.attrs[className] = '{{(' + protectionName + '.indexMap.' + className + '++)}}';
        the[_addEventProxy]('keyup', className);
        the[_addEventProxy]('change', className);
        the[_addEventProxy]('click', className);

        return [beforeCode, afterCode];
    });
};


/**
 * 初始化 skip 指令
 */
pro[_initDirectiveSkip] = function () {
    var the = this;
    // @skip
    the[_tpl].directive('skip', 10, function (vnode, directive) {

    });
};


/**
 * 监听数据
 */
pro[_watch] = function () {
    var the = this;

    the[_watcher] = new Watcher(the[_data]);
    the[_watcher].on('change', fun.debounce(function (key, newVal, oldVal, parent) {
        if (the[_destroyed]) {
            return;
        }

        // 只对根元素有效
        if (parent === the[_data]) {
            the.emit(WATCH_PREFIX + key, newVal, oldVal);
        }

        the.update();
    }, the[_options].debounceTime));
};


/**
 * 添加事件代理
 * @param type
 * @param className
 */
pro[_addEventProxy] = function (type, className) {
    var the = this;
    var proxyId = type + EVENT_PROXY_ID_SPLIT + className;

    event.on(the[_containerEl], type, '.' + className, the[_eventProxyMap][proxyId] = function (ev) {
        var el = this;
        var index = attribute.attr(el, className);
        var fnList = the[_protection].listeners[className];
        var fn = fnList[index];

        fn.call(the[_data], el, ev);
    });
};

ViewModel.defaults = defaults;
module.exports = ViewModel;
