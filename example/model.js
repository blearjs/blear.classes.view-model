/**
 * 文件描述
 * @author ydr.me
 * @create 2016-06-03 15:40
 */


'use strict';

var Model = require('../src/index');
var modification = require('blear.core.modification');

var demoEl = document.getElementById('demo');
var ulEl = demoEl.children[0];

var vm = new Model({
    el: '#demo',
    data: {
        list: [1, 2, 3, 4],
        radio: 0,
        radio2: 0
    }
});
var liEl = document.createElement('li');
liEl.innerHTML = '<input>';
vm.insert(liEl, vm.el.children[0]);

