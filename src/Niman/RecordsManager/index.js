const now = Date.now();
const statusField = `status_${now}`;
const idField = `id_${now}`;
const metaField = `meta_$(now)`;

let uniId = 1;


// 克隆
 function cloneRecords(records = []) {
    return JSON.parse(JSON.stringify(initRecords(records))).map(record => {
        record[idField] = uniId++;
        return record;
    });
}

function initMeta(records = [], metaOrRecords = []) {

    let meta;

    if (Array.isArray(metaOrRecords)) {
        meta = metaOrRecords[metaField] || {};
    } else {
        meta = metaOrRecords || {};
    }

    if (!records[metaField]) {
        records[metaField] = meta;
    }

    return records;
}

// 初始化
 function initRecords(records = null, meta = {}) {
    if (records === null) {
        return initMeta([], meta);
    }

    if (records instanceof Set) {
        records = Array.from(records);
    }

    if (records instanceof RecordsManager) {
        records = records.getRecords();
    }

    meta = records[metaField] || meta;
    records = [].concat(records);

    const result = records.filter(record => {
        return typeof record === 'object' && record !== null;
    }).map(record => {
        if (!record[statusField]) {
            record[statusField] = {};
        }

        if (!record[idField]) {
            record[idField] = uniId++;
        }

        return record;
    });

    return initMeta(result, records);
}

// 选择
 function selectRecords(records = [], selectedRecords = records, flag = true, init = false) {

    if (arguments.length === 3) {
        init = flag;
        flag = selectedRecords;
        selectedRecords = records;
    }

    selectedRecords = initRecords(selectedRecords);

    const selectsIds = selectedRecords.map(item => item[idField]);

    const result = initRecords(records).map(record => {
        if (!selectsIds.includes(record[idField])) {
            return record;
        }

        record[statusField].isSelected = flag;
        if (flag && init) {
            record[statusField].initSelected = true;
        }

        return record;
    });

    return initMeta(result, records);
}

// 替换
 function replaceRecords(records = [], record1, record2, syncStatus = true) {
    initRecords(records);

    if (record1 === undefined || record2 === undefined || record1 === null || record2 === null) {
        return records;
    }

    for (let i = 0; i < records.length; i++) {
        let item = records[i];
        if (item === record1 || item[idField] === record1[idField]) {
            records.splice(i, 1, record2);
            initRecords(records);
            if (syncStatus) {
                record2[statusField] = {...record1[statusField]};
            }

            record2[statusField].oldRecord = record1;

            return records;
        }
    }

    records.push(record2);
    if (syncStatus) {
       asNewRecords(record2);
    }
    initRecords(records);
    return records;
}

// 改变
 function updateRecords(...args) {

    let [records = [], field = null, value = null] = args;

    if (args.length === 3, field === null) {
        return initRecords(records);
    }

    let merge = false;

    if (args.length === 2 && typeof field === 'object') {
        merge = true;
    }

    let setFieldValue = function(record, field, value) {
        const status = record[statusField];

        // 用于保存原始数据
        if (!status.old) {
            status.old = {};
        }

        // 当前字段是初始值
        if (status.old[field] === undefined) {
            status.old[field] = record[field];
        }

        // 改回初始值
        if (status.old[field] === value) {
            delete status.old[field];
        }

        record[field] = value;

        // 当前数据和初始数据相同，删除原始数据备份
        if (Object.keys(status.old).length === 0) {
            delete status.old;
        }

        return record;
    }

    let setValue;

    if (merge) {
        setValue = function(record, value) {

            for (let key in field) {
                if (key === statusField || key === idField) {
                    continue;
                }
                setFieldValue(record, key, field[key]);
            }

            return record;
        }
    } else {
        setValue =  function(record) {
            setFieldValue(record, field, value);
            return record;
        };
    }


    const result = initRecords(records).map(record => {

        setValue(record);

        return record;
    });

    return initMeta(result, records);
}

// 新增
 function addRecord(records = [], newRecords = null) {
    records = initRecords(records);

    if (newRecords === null) {
        return records;
    }

    newRecords = initRecords(newRecords).map(record => {
        record[statusField].isNew = true;
        return record;
    });

    return initMeta(records.concat(newRecords), records);
}

// 标记为新增
 function asNewRecords(records = []) {
    const result = initRecords(records).map(record => {
        record[statusField].isNew = true;
        record[statusField].asNew = true;
        return record;
    });

    return initMeta(result, records);
}

// 标记为忽略
 function asIgnoreRecords(records = []) {
    const result = initRecords(records).map(record => {
        record[statusField].isIgnore = true;
        return record;
    });

    return initMeta(result, records);
}

// 自定义标签
 function markRecords(records = [], markers = null, flag = true) {

    if (markers === null) {
        return initRecords(records);
    }

    markers = [].concat(markers);

    const result = initRecords(records).map(record => {
        const status = record[statusField];

        if (!status.markers) {
            status.markers = [];
        }

        if (flag) {
            status.markers = Array.from(new Set([markers].concat(status.markers)));
        } else {
            const theMarkers = new Set(status.markers);
            markers.forEach(marker => theMarkers.delete(marker));
            status.markers = Array.from(theMarkers);
        }

        if (!status.markers.length) {
            delete status.markers;
        }

        return record;
    });

    return initMeta(result, records);
}

// 根据标签过滤
 function getRecordsByMarker(records = [], markers = [], ...args) {

    markers = [].concat(markers);

    const result = initRecords(records).filter(record => {
        const status = record[statusField];

        if (!status.markers) {
            return false;
        }

        for (let mark of markers) {
            if (status.markers.includes(mark)) {
                return true;
            }
        }

        return false;
    });

    if (!args.length) {
        return initMeta(result, records);
    }

    return getRecordsByMarker(result, ...args);
}

// 删除
 function removeRecords(records = [], delRecords = records) {

    delRecords = initRecords(delRecords);

    const delIds = delRecords.map(item => item[idField]);

    const result = initRecords(records) .map(record => {

        if (!delIds.includes(record[idField])) {
            return record;
        }

        const status = record[statusField];

        if (status.isNew && !status.asNew) {
            return null;
        }

        status.isDeleted = true;

        return record;
    }).filter(record => record !== null);

    return initMeta(result, records);
}

function _isStatus(records, statusName, flag) {
    const record = initRecords(records)[0];
    if (!record || !record[statusField][statusName]) {
        return false === flag;
    }

    return true === flag;
}

// 是否选中忽略
 function isIgnore(records = [], flag = true) {
    return _isStatus(records, 'isIgnore', flag);
}

// 是否选中
 function isSelected(records = [], flag = true) {
    return _isStatus(records, 'isSelected', flag);
}

// 是否新增
 function isNew(records = [], flag = true) {
    return _isStatus(records, 'isNew', flag);
}

// 是否改变
 function isModified(records = [], flag = true) {
    return _isStatus(records, 'old', flag);
}

// 是否包含
 function isInclude(records = [], record, flag = true) {
    const result = initRecords(records).filter(item => item === record || item[idField] === record[idField]).length > 0;
    return result === flag;
}


// 是否删除
 function isDeleted(records = [], flag = true) {
    return _isStatus(records, 'isDeleted', flag);
}

// 数据是否包括标签
 function hasMarker(records = [], markers = [], flag = true) {
    const record = initRecords(records)[0];
    if (!record) {
        return false === flag;
    }

    const theMarkers = record[statusField].markers;

    for (let mark of markers) {
        if (theMarkers.includes(mark)) {
            return true === flag;
        }
    }

    return false === flag;
}

// 是否有错
 function hasError(records = [], field = null, flag = true) {
    const record = initRecords(records)[0];

    if (!record) {
        return false === flag;
    }

    const error = record[statusField].error;

    if (field === null) {
        return !!error === flag;
    }

    if (error.hasOwnProperty(field)) {
        return flag === true;
    }

    return false === flag;
}

// 取得错误信息
 function getErrorMsg(records = []) {
    return initRecords(records)
        .filter(record => {
            return !!record[statusField].error;
        }).map(record => {
            return {
                [idField]: record[idField],
                ...record[statusField].error
            };
        });
}

// 重置
 function resetRecords(records = []) {
    const result = initRecords(records).map(record => {
        let myStatus = record[statusField] || {};

        if (myStatus.oldRecord) {
            record = myStatus.oldRecord;
            myStatus = record[statusField] || {};
        }

        if (myStatus.isNew && !myStatus.asNew) {
            return null;
        }

        if (myStatus.isSelected && !myStatus.initSelected) {
            myStatus.isSelected = false;
        }

        Object.assign(record, myStatus.old);

        delete myStatus.error;
        delete myStatus.isDeleted;
        delete myStatus.old;
        delete myStatus.asNew;
        delete myStatus.markes;

        return record;
    }).filter(record => record !== null);

    return initMeta(result, records);
}

// 错误
 function setErrorRecords(records = [], field = null, msg = '') {
    const result = initRecords(records).map(record => {
        if (!record[statusField].error) {
            record[statusField].error = {};
        }

        const error = record[statusField].error;

        if (field === null) {
            field = idField;
        }

        if (msg === false) {
            delete error[field];
        } else {
            error[field] = msg;
        }

        if (Object.keys(error).length === 0) {
            delete record[statusField].error;
        }

        return record;
    });

    return initMeta(result, records);
}

// 清除错误
 function clearErrorRecords(records = []) {
    const result = initRecords(records).map(record => {
        delete record[statusField].error;
        return record;
    });

    return initMeta(result, records);
}

// 清除新增
 function clearNewRecords(records = [], includeMarker = false) {
    const result = initRecords(records).map(record => {
        const status = record[statusField];

        if (status.isNew) {
            if (includeMarker && status.asNew) {
                delete status.asNew;
            } else {
                return null
            }
        }

        return record;
    }).filter(record => record !== null);

    return initMeta(result, records);
}

// 恢复删除
 function unremoveRecords(records = []) {
    const result = initRecords(records).map(record => {
        delete record[statusField].isDeleted;
        return record;
    });

    return initMeta(result, records);
}


// 所有状态
const allStatus = [
    'new', // 新增
    'modified', // 改变
    'deleted', // 删除
    'selected', // 选中
    'error', // 错误
    'ignore', //忽略
    'effective', // 有效
    '!new',
    '!modified',
    '!deleted',
    '!selected',
    '!error',
    '!ignore',
    '!effective',
];

// 根据id或数据获取数据
 function getRecordsById(records = [], ids = []) {
    ids = [].concat(ids);

    if (!ids.length) {
        return [];
    }

    if (typeof ids[0] === 'object') {
        ids = ids.map(record => record[idField]);
    }

    const result = initRecords(records).filter(record => ids.includes(record[idField]));

    return initMeta(result, records);
}

function _isEffective(status) {
    return !status.error && !status.isDeleted && !status.isIgnore;
}

// 是否有效
 function isEffective(records = [], flag = true) {
    const record = initRecords(records)[0];

    if (!record) {
        return flag === false;
    }

    return _isEffective(record[statusField]) === flag;
}

// 按照给定条件过滤
 function filterRecords(records = [], conOrFun = [], ...args) {
    let condition;
    if (typeof conOrFun === 'function') {
        condition = conOrFun;
    } else {
        const status = [].concat(conOrFun);

        status.forEach(s1 => {
            if (!allStatus.includes(s1)) {
                throw new Error(`unknown status ${s1}.`);
            }
        });

        condition = function(record) {
            const myStatus = record[statusField] || {};

            if (status.includes('new') && myStatus.isNew) {
                return true;
            }

            if (status.includes('!new') && !myStatus.isNew) {
                return true;
            }

            if (status.includes('modified') && myStatus.old) {
                return true;
            }

            if (status.includes('!modified') && !myStatus.old) {
                return true;
            }

            if (status.includes('deleted') && myStatus.isDeleted) {
                return true;
            }

            if (status.includes('!deleted') && !myStatus.isDeleted) {
                return true;
            }

            if (status.includes('selected') && myStatus.isSelected) {
                return true;
            }

            if (status.includes('!selected') && !myStatus.isSelected) {
                return true;
            }

            if (status.includes('error') && myStatus.error) {
                return true;
            }

            if (status.includes('!error') && !myStatus.error) {
                return true;
            }

            if (status.includes('ignore') && myStatus.isIgnore) {
                return true;
            }

            if (status.includes('!ignore') && !myStatus.isIgnore) {
                return true;
            }

            const effective = _isEffective(myStatus);

            if (status.includes('effective') && effective) {
                return true;
            }

            if (status.includes('!effective') && !effective) {
                return true;
            }

            return false;
        }
    }

    const result = initRecords(records).filter(condition);

    if (!args.length) {
        return initMeta(result, records);
    }

    return filterRecords(result, ...args);
}

// 返回没有状态信息的数据
 function getPureRecords(records = []) {
    return initRecords(records).map(record => {
        const newRecord = {
            ...record
        };

        delete newRecord[idField];
        delete newRecord[statusField];

        return newRecord;
    });
}

// 获得有效数据（非删除、非忽略）
 function getEffectiveRecords(records = []) {
    const result = initRecords(records).filter(record => {
        return _isEffective(record[statusField]);
    });

    return initMeta(result, records);
}

// 获得元数据信息
 function getMeta(records) {
    return initRecords(records)[metaField];
}

// 是否有相同得元数据;
 function isSameMeta(records = [], records2 = []) {
    if (records2 instanceof RecordsManager) {
        records2 = records.getRecords();
    }

    return getMeta(records) === getMeta(records2)
}

// 映射
function mapRecords(records, callback) {
    if (!callback) {
        return initRecords(records);
    }

    return initRecords(records.map(item => {
        return callback(item);
    }));
}

// 可以链式调用的方法
const chainMethods = {
    addRecord,
    asNewRecords,
    asIgnoreRecords,
    mapRecords,
    markRecords,
    replaceRecords,
    removeRecords,
    updateRecords,
    filterRecords,
    selectRecords,
    resetRecords,
    cloneRecords,
    setErrorRecords,
    clearErrorRecords,
    clearNewRecords,
    unremoveRecords,
    getRecordsById,
    getEffectiveRecords,
    getRecordsByMarker,
};

// 会中断调用链的方法
const endMethods = {
    getPureRecords,
    getErrorMsg,
    isInclude,
    isSelected,
    isNew,
    isModified,
    isDeleted,
    isIgnore,
    isEffective,
    isSameMeta,
    hasError,
    hasMarker,
};

// 可以链式调用方法的RecordsManager类
 class RecordsManager {
    constructor(records, meta = {}) {
        if (records instanceof RecordsManager) {
            records = records.getRecords();
            meta = records;
        }

        this.records = initRecords(records, meta);

        for (let method in chainMethods) {
            this[method] = (...args) => {
                return new RecordsManager(chainMethods[method](this.records, ...args));
            }
        }

        for (let method in endMethods) {
            this[method] = (...args) => {
                return endMethods[method](this.records, ...args);
            }
        }
    }

    getRecords() {
        return [].concat(this.records);
    }
};

// 调用链起点
function $RM(records, meta) {
    return new RecordsManager(records, meta);
}

$RM.registerChain = function(name, fun) {
    chainMethods[name] = fun;
};

$RM.registerEnd = function(name, fun) {
    endMethods[name] = fun;
};

$RM.RecordsManager = RecordsManager;

$RM.initRecords = initRecords;
$RM.initMeta = initMeta;

$RM.chainMethods = chainMethods;
$RM.endMethods = endMethods;


export default  $RM;

export {
    idField
}



$RM.chainMethods.treeToList = function(records, children = 'children', id = 'id', pid = 'pid') {

    const result = [];

    function trace(list, pidValue = null) {
        for (let item of list) {

            result.push({
                ...item,
                [pid]: pidValue
            });

            if (Array.isArray(item[children])) {
                trace(item[children], item[id]);
            }

        }
    }

    trace(records);

    return $RM.initRecords($RM.endMethods.getPureRecords(result));
}
