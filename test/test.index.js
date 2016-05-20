/**
 * 测试 文件
 * @author ydr.me
 * @create 2016-05-17 12:13
 */


'use strict';

var ViewModel = require('../src/index.js');
var event = require('blear.core.event');
var howdo = require('blear.utils.howdo');

describe('测试文件', function () {
    var delay = function (next) {
        setTimeout(function () {
            next();
        }, 10);
    };

    it('element innerHTML', function (done) {
        var el = document.createElement('div');
        el.innerHTML = '{{a}}';
        document.body.appendChild(el);

        var data = {a: '...'};

        var vm = new ViewModel({
            el: el,
            data: data
        });

        expect(el.innerHTML).toEqual('...');

        vm.destroy();
        document.body.removeChild(el);

        done();
    });

    it('element template element', function (done) {
        var el = document.createElement('div');
        var scriptEl = document.createElement('script');
        scriptEl.type = 'text/template';
        scriptEl.innerHTML = '{{a}}';
        document.body.appendChild(el);
        document.body.appendChild(scriptEl);

        var data = {a: '...'};

        var vm = new ViewModel({
            el: el,
            template: scriptEl,
            data: data
        });

        expect(el.innerHTML).toEqual('...');

        vm.destroy();
        document.body.removeChild(el);
        document.body.removeChild(scriptEl);

        done();
    });

    it('element template string', function (done) {
        var el = document.createElement('div');
        document.body.appendChild(el);

        var data = {a: '...'};

        var vm = new ViewModel({
            el: el,
            template: '{{a}}',
            data: data
        });

        expect(el.innerHTML).toEqual('...');

        vm.destroy();
        document.body.removeChild(el);

        done();
    });

    it('duplicate instance', function (done) {
        var el = document.createElement('div');
        document.body.appendChild(el);

        var data = {a: '...'};

        var vm1 = new ViewModel({
            el: el,
            template: '{{a}}',
            data: data
        });

        var hasError = false;

        try {
            var vm2 = new ViewModel({
                el: el,
                template: '{{a}}',
                data: data
            });
        } catch (err) {
            hasError = true;
        }

        expect(hasError).toEqual(true);

        vm1.destroy();
        document.body.removeChild(el);

        done();
    });

    it('notfound element', function (done) {
        var data = {a: '...'};
        var hasError = false;

        try {
            var vm1 = new ViewModel({
                el: '#xxxxxxxxxxxxxxxxxxxxx',
                template: '{{a}}',
                data: data
            });
        } catch (err) {
            hasError = true;
        }

        expect(hasError).toEqual(true);

        done();
    });

    it('#watch', function (done) {
        var el = document.createElement('div');
        el.innerHTML = '{{a}}';
        document.body.appendChild(el);

        var data = {
            a: '...',
            b: '///'
        };
        var changeATimes = 0;
        var changeBTimes = 0;

        var vm = new ViewModel({
            el: el,
            data: data,
            watches: {
                a: function () {
                    changeATimes++;
                }
            }
        });

        vm.watch('b', function () {
            changeBTimes++;
        });

        howdo
            .task(function (next) {
                expect(el.innerHTML).toEqual('...');

                data.a = '???';
                delay(next);
            })
            .task(function (next) {
                expect(el.innerHTML).toEqual('???');
                expect(changeATimes).toEqual(1);
                expect(changeBTimes).toEqual(0);

                data.b = '{{{';

                delay(next);
            })
            .task(function (next) {
                expect(el.innerHTML).toEqual('???');
                expect(changeATimes).toEqual(1);
                expect(changeBTimes).toEqual(1);

                delay(next);
            })
            .follow(function () {
                vm.destroy();
                document.body.removeChild(el);

                done();
            });
    });

    it('#method', function (done) {
        var el = document.createElement('div');
        el.innerHTML = '{{f1(a)}}';
        document.body.appendChild(el);

        var data = {
            a: '...',
            b: '///'
        };

        var vm = new ViewModel({
            el: el,
            data: data,
            methods: {
                f1: function (str) {
                    return (str + 'f1');
                }
            }
        });

        expect(el.innerHTML).toEqual('...f1');

        vm.destroy();
        document.body.removeChild(el);
        done();
    });

    it('viewModel nesting', function (done) {
        var div1El = document.createElement('div');
        var div2El = document.createElement('div');
        var p1El = document.createElement('p');
        var p2El = document.createElement('p');

        p1El.innerHTML = '{{a}}';
        p2El.innerHTML = '{{b}}';

        div1El.appendChild(p1El);
        div2El.appendChild(p2El);

        document.body.appendChild(div1El);

        var data = {
            a: 'aa',
            b: 'bb'
        };
        var vm1 = new ViewModel({
            el: div1El,
            data: data
        });

        div1El.appendChild(div2El);
        var vm2 = new ViewModel({
            el: div2El,
            data: data
        });

        howdo
            .task(function (next) {
                expect(p1El.innerHTML).toEqual('aa');
                expect(p2El.innerHTML).toEqual('bb');

                data.a = 'aaa';

                delay(next);
            })
            .task(function (next) {
                expect(p1El.innerHTML).toEqual('aaa');
                expect(p2El.innerHTML).toEqual('bb');

                data.b = 'bbb';

                delay(next);
            })
            .task(function (next) {
                expect(p1El.innerHTML).toEqual('aaa');
                expect(p2El.innerHTML).toEqual('bbb');

                vm1.destroy();
                data.a = 'aaaa';
                delay(next);
            })
            .task(function (next) {
                expect(p1El.innerHTML).toEqual('aaa');
                expect(p2El.innerHTML).toEqual('bbb');

                vm2.destroy();
                data.b = 'bbbb';
                delay(next);
            })
            .task(function (next) {
                expect(p1El.innerHTML).toEqual('aaa');
                expect(p2El.innerHTML).toEqual('bbb');

                delay(next);
            })
            .task(function (next) {
                document.body.removeChild(div1El);

                delay(next);
            })
            .follow(done);
    });

    it('@model input:text', function (done) {
        var id = 'r' + new Date().getTime();
        var el = document.createElement('div');
        el.innerHTML = '<input type="text" @model="a" id="' + id + '">';
        var pEl = document.createElement('p');
        pEl.innerHTML = '{{a}}';
        var data = {
            a: 1
        };

        el.appendChild(pEl);
        document.body.appendChild(el);

        var inputEl = document.getElementById(id);
        var vm = new ViewModel({
            el: el,
            data: data
        });

        howdo
            .task(function (next) {
                expect(pEl.innerHTML).toEqual('1');
                expect(inputEl.value).toEqual('1');

                delay(next);
            })
            .task(function (next) {
                inputEl.value = 2;
                event.emit(inputEl, 'change');

                delay(next);
            })
            .task(function (next) {
                expect(pEl.innerHTML).toEqual('2');
                expect(data.a).toEqual('2');

                delay(next);
            })
            .task(function (next) {
                vm.destroy();
                document.body.removeChild(el);

                delay(next);
            })
            .follow(done);
    });

    it('@model input:text2', function (done) {
        var id = 'r' + new Date().getTime();
        var className = 'p' + new Date().getTime();
        var el = document.createElement('div');
        el.innerHTML = '<input type="text" @model="list[0]" id="' + id + '">' +
            '<input type="text" @for="index, item in list" @model="list[index]" class="' + className + '">';
        var pEl = document.createElement('p');
        pEl.innerHTML = '{{list[0]}}';
        var data = {
            list: [1, 2]
        };

        el.appendChild(pEl);
        document.body.appendChild(el);

        var inputEl = document.getElementById(id);
        var input2El = document.querySelectorAll('.' + className)[0];
        var vm = new ViewModel({
            el: el,
            data: data
        });

        howdo
            .task(function (next) {
                pEl = el.querySelectorAll('p')[0];
                expect(pEl.innerHTML).toEqual('1');
                expect(inputEl.value).toEqual('1');
                expect(input2El.value).toEqual('1');

                delay(next);
            })
            .task(function (next) {
                inputEl.value = 2;
                event.emit(inputEl, 'change');

                delay(next);
            })
            .task(function (next) {
                expect(pEl.innerHTML).toEqual('2');
                expect(inputEl.value).toEqual('2');
                expect(input2El.value).toEqual('2');
                expect(data.list).toEqual(['2', 2]);

                delay(next);
            })
            .task(function (next) {
                input2El.value = 3;
                event.emit(input2El, 'change');

                delay(next);
            })
            .task(function (next) {
                expect(pEl.innerHTML).toEqual('3');
                expect(inputEl.value).toEqual('3');
                expect(input2El.value).toEqual('3');
                expect(data.list).toEqual(['3', 2]);

                delay(next);
            })
            .task(function (next) {
                vm.destroy();
                document.body.removeChild(el);

                delay(next);
            })
            .follow(done);
    });

    it('@model input:checkbox:noname', function (done) {
        var id = 'r' + new Date().getTime();
        var el = document.createElement('div');
        el.innerHTML = '<input type="checkbox" @model="a" id="' + id + '">';
        var pEl = document.createElement('p');
        pEl.innerHTML = '{{a}}';
        var data = {
            a: false
        };

        el.appendChild(pEl);
        document.body.appendChild(el);

        var inputEl = document.getElementById(id);
        var vm = new ViewModel({
            el: el,
            data: data
        });

        howdo
            .task(function (next) {
                expect(pEl.innerHTML).toEqual('false');
                expect(inputEl.checked).toEqual(false);

                delay(next);
            })
            .task(function (next) {
                inputEl.checked = true;
                event.emit(inputEl, 'change');

                delay(next);
            })
            .task(function (next) {
                expect(pEl.innerHTML).toEqual('true');
                expect(data.a).toEqual(true);

                delay(next);
            })
            .task(function (next) {
                vm.destroy();
                document.body.removeChild(el);

                delay(next);
            })
            .follow(done);
    });

    it('@model input:checkbox:name', function (done) {
        var name = 'n' + new Date().getTime();
        var id1 = 'r1' + new Date().getTime();
        var id2 = 'r2' + new Date().getTime();
        var el = document.createElement('div');
        el.innerHTML = '<input name="' + name + '" value="1" type="checkbox" @model="a" id="' + id1 + '">' +
            '<input name="' + name + '" value="2" type="checkbox" @model="a" id="' + id2 + '">';
        var pEl = document.createElement('p');
        pEl.innerHTML = '{{a}}';
        var data = {
            a: []
        };

        el.appendChild(pEl);
        document.body.appendChild(el);

        var input1El = document.getElementById(id1);
        var input2El = document.getElementById(id2);
        var vm = new ViewModel({
            el: el,
            data: data
        });

        howdo
            .task(function (next) {
                expect(pEl.innerHTML).toEqual(data.a.join(','));
                expect(input1El.checked).toEqual(false);
                expect(input2El.checked).toEqual(false);

                delay(next);
            })
            .task(function (next) {
                input1El.checked = true;
                event.emit(input1El, 'change');

                delay(next);
            })
            .task(function (next) {
                expect(pEl.innerHTML).toEqual(data.a.join(','));
                expect(input1El.checked).toEqual(true);
                expect(input2El.checked).toEqual(false);
                expect(data.a).toEqual(['1']);

                delay(next);
            })
            .task(function (next) {
                vm.destroy();
                document.body.removeChild(el);

                delay(next);
            })
            .follow(done);
    });

    it('@model input:radio:name', function (done) {
        var name = 'n' + new Date().getTime();
        var id1 = 'r1' + new Date().getTime();
        var id2 = 'r2' + new Date().getTime();
        var el = document.createElement('div');
        el.innerHTML = '<input name="' + name + '" value="1" type="radio" @model="a" id="' + id1 + '">' +
            '<input name="' + name + '" value="2" type="radio" @model="a" id="' + id2 + '">';
        var pEl = document.createElement('p');
        pEl.innerHTML = '{{a}}';
        var data = {
            a: '1'
        };

        el.appendChild(pEl);
        document.body.appendChild(el);

        var input1El = document.getElementById(id1);
        var input2El = document.getElementById(id2);
        var vm = new ViewModel({
            el: el,
            data: data
        });

        howdo
            .task(function (next) {
                expect(pEl.innerHTML).toEqual('1');
                expect(input1El.checked).toEqual(true);
                expect(input2El.checked).toEqual(false);

                delay(next);
            })
            .task(function (next) {
                input2El.checked = true;
                event.emit(input2El, 'change');

                delay(next);
            })
            .task(function (next) {
                expect(pEl.innerHTML).toEqual('2');
                expect(input1El.checked).toEqual(false);
                expect(input2El.checked).toEqual(true);
                expect(data.a).toEqual('2');

                delay(next);
            })
            .task(function (next) {
                vm.destroy();
                document.body.removeChild(el);

                delay(next);
            })
            .follow(done);
    });

    it('@model select:one', function (done) {
        var el = document.createElement('div');
        var id = 's' + new Date().getTime();

        el.innerHTML = '<select @model="a" id="' + id + '">' +
            '<option value="1">1</option>' +
            '<option value="{{b}}">{{b}}</option>' +
            '<option value="3">3</option>' +
            '<option value="4">4</option>' +
            '</select>';
        var pEl = document.createElement('p');
        pEl.innerHTML = '{{a}}';

        el.appendChild(pEl);
        document.body.appendChild(el);

        var selecteEl = document.getElementById(id);
        var data = {
            a: '2',
            b: '2'
        };
        var vm = new ViewModel({
            el: el,
            data: data
        });

        howdo
            .task(function (next) {
                expect(selecteEl.value).toEqual('2');
                expect(pEl.innerHTML).toEqual('2');

                delay(next);
            })
            .task(function (next) {
                selecteEl.value = '3';
                event.emit(selecteEl, 'change');

                delay(next);
            })
            .task(function (next) {
                expect(selecteEl.value).toEqual('3');
                expect(pEl.innerHTML).toEqual('3');
                expect(data.a).toEqual('3');

                delay(next);
            })
            .task(function (next) {
                vm.destroy();
                document.body.removeChild(el);

                delay(next);
            })
            .follow(done);
    });

    it('@model select:multiple', function (done) {
        var el = document.createElement('div');
        var id = 's' + new Date().getTime();

        el.innerHTML = '<select @model="a" id="' + id + '" multiple>' +
            '<option value="1">1</option>' +
            '<option value="2">2</option>' +
            '<option value="3">3</option>' +
            '<option value="4">4</option>' +
            '</select>';
        var pEl = document.createElement('p');
        pEl.innerHTML = '{{a}}';

        el.appendChild(pEl);
        document.body.appendChild(el);

        var selecteEl = document.getElementById(id);
        var optionEls = selecteEl.getElementsByTagName('option');
        var data = {
            a: '2'
        };
        var vm = new ViewModel({
            el: el,
            data: data
        });

        howdo
            .task(function (next) {
                expect(selecteEl.value).toEqual('2');
                expect(pEl.innerHTML).toEqual('2');

                delay(next);
            })
            .task(function (next) {
                optionEls[0].selected = true;
                optionEls[1].selected = true;
                optionEls[2].selected = true;
                optionEls[3].selected = false;
                event.emit(selecteEl, 'change');

                delay(next);
            })
            .task(function (next) {
                expect(pEl.innerHTML).toEqual('1,2,3');
                expect(data.a).toEqual(['1', '2', '3']);

                delay(next);
            })
            .task(function (next) {
                vm.destroy();
                document.body.removeChild(el);

                delay(next);
            })
            .follow(done);
    });

    it('@model textarea', function (done) {
        var id = 'r' + new Date().getTime();
        var el = document.createElement('div');
        el.innerHTML = '<textarea @model="a" id="' + id + '"></textarea>';
        var pEl = document.createElement('p');
        pEl.innerHTML = '{{=a}}';
        var data = {
            a: '<b></b>'
        };

        el.appendChild(pEl);
        document.body.appendChild(el);

        var textareaEl = document.getElementById(id);
        var vm = new ViewModel({
            el: el,
            data: data
        });

        howdo
            .task(function (next) {
                expect(pEl.innerHTML).toEqual('<b></b>');
                expect(textareaEl.value).toEqual('<b></b>');

                delay(next);
            })
            .task(function (next) {
                textareaEl.value = '2';
                event.emit(textareaEl, 'change');

                delay(next);
            })
            .task(function (next) {
                expect(pEl.innerHTML).toEqual('2');
                expect(data.a).toEqual('2');

                delay(next);
            })
            .task(function (next) {
                vm.destroy();
                document.body.removeChild(el);

                delay(next);
            })
            .follow(done);
    });

    it('@event', function (done) {
        var el = document.createElement('div');
        var id1 = 'e' + new Date().getTime();
        var id2 = 'f' + new Date().getTime();
        var id3 = 'g' + new Date().getTime();
        var id4 = 'h' + new Date().getTime();

        el.innerHTML = '<div @click="onClick1" id="' + id1 + '"></div>' +
            '<div @click="onClick2($el)" id="' + id2 + '"></div>' +
            '<div @click="onClick3($el, $event)" id="' + id3 + '"></div>' +
            '<div @click="onClick4(a)" id="' + id4 + '"></div>' +
            '';

        document.body.appendChild(el);

        var div1El = document.getElementById(id1);
        var div2El = document.getElementById(id2);
        var div3El = document.getElementById(id3);
        var div4El = document.getElementById(id4);
        var data = {
            a: 1
        };
        var onClick1Times = 0;
        var onClick2Times = 0;
        var onClick3Times = 0;
        var onClick4Times = 0;
        var onClicl2El = null;
        var onClicl3El = null;
        var onClicl3Ev = null;
        var onClicl4Arg = null;
        var methods = {
            onClick1: function () {
                onClick1Times++;
            },
            onClick2: function (el) {
                onClick2Times++;
                onClicl2El = el;
            },
            onClick3: function (el, ev) {
                onClick3Times++;
                onClicl3El = el;
                onClicl3Ev = ev;
            },
            onClick4: function (arg) {
                onClick4Times++;
                onClicl4Arg = arg;
            }
        };
        var vm = new ViewModel({
            el: el,
            data: data,
            methods: methods
        });

        howdo
            .task(function (next) {
                event.emit(div1El, 'click');

                delay(next);
            })
            .task(function (next) {
                expect(onClick1Times).toEqual(1);
                expect(onClick2Times).toEqual(0);
                expect(onClick3Times).toEqual(0);
                expect(onClick4Times).toEqual(0);
                expect(onClicl2El).toEqual(null);
                expect(onClicl3El).toEqual(null);
                expect(onClicl3Ev).toEqual(null);
                expect(onClicl4Arg).toEqual(null);

                event.emit(div2El, 'click');

                delay(next);
            })
            .task(function (next) {
                expect(onClick1Times).toEqual(1);
                expect(onClick2Times).toEqual(1);
                expect(onClick3Times).toEqual(0);
                expect(onClick4Times).toEqual(0);
                expect(onClicl2El).toEqual(div2El);
                expect(onClicl3El).toEqual(null);
                expect(onClicl3Ev).toEqual(null);
                expect(onClicl4Arg).toEqual(null);

                event.emit(div3El, 'click');

                delay(next);
            })
            .task(function (next) {
                expect(onClick1Times).toEqual(1);
                expect(onClick2Times).toEqual(1);
                expect(onClick3Times).toEqual(1);
                expect(onClick4Times).toEqual(0);
                expect(onClicl2El).toEqual(div2El);
                expect(onClicl3El).toEqual(div3El);
                expect(onClicl3Ev.type).toEqual('click');
                expect(onClicl4Arg).toEqual(null);

                event.emit(div4El, 'click');

                delay(next);
            })
            .task(function (next) {
                expect(onClick1Times).toEqual(1);
                expect(onClick2Times).toEqual(1);
                expect(onClick3Times).toEqual(1);
                expect(onClick4Times).toEqual(1);
                expect(onClicl2El).toEqual(div2El);
                expect(onClicl3El).toEqual(div3El);
                expect(onClicl3Ev.type).toEqual('click');
                expect(onClicl4Arg).toEqual(data.a);

                delay(next);
            })
            .task(function (next) {
                vm.destroy();
                document.body.removeChild(el);

                delay(next);
            })
            .follow(done);
    });
});
