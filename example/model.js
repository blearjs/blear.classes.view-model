/**
 * 文件描述
 * @author ydr.me
 * @create 2016-06-03 15:40
 */


'use strict';

var Model = require('../src/index');


new Model({
    el: '#demo',
    data: {
        list: [1, 2, 3, 4],
        radio: 0,
        radio2: 0
    }
});


