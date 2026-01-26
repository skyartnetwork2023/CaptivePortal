const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const https = require('https');

const OMADA_API = 'https://dominical-unbrazen-janetta.ngrok-free.dev';
const OMADA_ID = 'd660ecc8e7ea60b1e60fb07b26e2f598';
const OMADA_SITE_ID = '6741bf3314c67d319d0e644b';
const CLIENT_ID = '1dcc674ba6a44ebbb16654ad8a865ddd';
const CLIENT_SECRET = 'eda08b9ade8f4a1182d2c3b8efa7c763';
const DEFAULT_GROUP_ID = '67455aaff62dca21068ce83b';

const agent = new https.Agent({
  rejectUnauthorized: false
});


const app = express();
app.use(bodyParser.json());

// Allow CORS for local development
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.post('/api/voucher/status', function(req, res) {
  var voucherCode = req.body && req.body.voucherCode ? req.body.voucherCode : null;
  res.status(501).json({
    error: 'Omada API integration not yet implemented.',
    suppliedVoucherCode: voucherCode
  });
});

function requestAccessToken() {
  return axios.post(
    OMADA_API + '/openapi/authorize/token?grant_type=client_credentials',
    {
      omadacId: OMADA_ID,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    },
    {
      headers: {
        'content-type': 'application/json'
      },
      httpsAgent: agent
    }
  );
}

function getAccessToken() {
  return requestAccessToken().then(function(response) {
    if (response.data && response.data.result && response.data.result.accessToken) {
      return response.data.result.accessToken;
    }
    throw new Error('Access token missing from Omada response');
  });
}

function fetchVoucherGroup(token, groupId, queryParams) {
  var params = Object.assign({
    page: 1,
    pageSize: 10
  }, queryParams || {});

  return axios.get(
    OMADA_API + '/openapi/v1/' + OMADA_ID + '/sites/' + OMADA_SITE_ID + '/hotspot/voucher-groups/' + groupId,
    {
      headers: {
        'content-type': 'application/json',
        'Authorization': 'AccessToken=' + token
      },
      httpsAgent: agent,
      params: params
    }
  );
}

function fetchVoucherGroupDirectory(token, page, pageSize) {
  return axios.get(
    OMADA_API + '/openapi/v1/' + OMADA_ID + '/sites/' + OMADA_SITE_ID + '/hotspot/voucher-groups',
    {
      headers: {
        'content-type': 'application/json',
        'Authorization': 'AccessToken=' + token
      },
      httpsAgent: agent,
      params: {
        page: page,
        pageSize: pageSize
      }
    }
  );
}

function fetchAllGroupDescriptors(token) {
  var page = 1;
  var pageSize = 50;
  var descriptors = [];
  var seenIds = {};

  function next() {
    return fetchVoucherGroupDirectory(token, page, pageSize).then(function(response) {
      var result = response.data && response.data.result ? response.data.result : null;
      var data = result && Array.isArray(result.data) ? result.data : [];
      var newCount = 0;

      data.forEach(function(item) {
        var groupId = item && (item.groupId || item.id || item.voucherGroupId);
        if (!groupId) {
          return;
        }
        if (seenIds[groupId]) {
          return;
        }
        seenIds[groupId] = true;
        newCount += 1;
        var descriptor = {
          groupId: groupId,
          groupName: item.groupName || item.name || null
        };
        descriptors.push(descriptor);
      });

      if (!data.length || newCount === 0) {
        return descriptors;
      }

      page += 1;
      return next();
    });
  }

  return next().catch(function(err) {
    if (descriptors.length) {
      return descriptors;
    }
    throw err;
  });
}

function normalizeString(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim().toLowerCase();
}

function extractVoucherMatches(payload, searchKey) {
  if (!payload || typeof payload !== 'object') {
    return {
      sanitized: payload,
      matchCount: 0
    };
  }

  var cloned;
  try {
    cloned = JSON.parse(JSON.stringify(payload));
  } catch (err) {
    return {
      sanitized: payload,
      matchCount: 0
    };
  }

  if (!cloned || !cloned.result || !Array.isArray(cloned.result.data)) {
    return {
      sanitized: cloned,
      matchCount: 0
    };
  }

  var normalizedKey = normalizeString(searchKey);
  cloned.result.data = cloned.result.data.filter(function(entry) {
    var code = normalizeString(entry && (entry.code || entry.voucherCode || entry.voucher_code));
    var voucherId = normalizeString(entry && (entry.voucherId || entry.voucherID || entry.id));
    return normalizedKey && (code === normalizedKey || voucherId === normalizedKey);
  });

  return {
    sanitized: cloned,
    matchCount: cloned.result.data.length
  };
}

function fetchVoucherDetail(token, voucherId) {
  return axios.get(
    OMADA_API + '/openapi/v1/' + OMADA_ID + '/sites/' + OMADA_SITE_ID + '/hotspot/vouchers/' + voucherId,
    {
      headers: {
        'content-type': 'application/json',
        'Authorization': 'AccessToken=' + token
      },
      httpsAgent: agent
    }
  );
}

app.post('/api/token', function(req, res) {
  requestAccessToken().then(function(response) {
    res.json(response.data);
  }).catch(function(error) {
    if (error.response) {
      res.status(error.response.status || 500).json({
        error: 'Failed to obtain token from Omada controller.',
        status: error.response.status,
        raw: error.response.data
      });
      return;
    }
    res.status(500).json({
      error: error.message
    });
  });
});

app.post('/api/group-details', function(req, res) {
  var groupId = req.body && req.body.groupId ? req.body.groupId : DEFAULT_GROUP_ID;
  var page = req.body && req.body.page ? req.body.page : 1;
  var pageSize = req.body && req.body.pageSize ? req.body.pageSize : 10;

  getAccessToken().then(function(token) {
    return fetchVoucherGroup(token, groupId, {
      page: page,
      pageSize: pageSize
    });
  }).then(function(response) {
    res.json(response.data);
  }).catch(function(error) {
    if (error.response) {
      res.status(error.response.status || 500).json({
        error: 'Failed to fetch group details from Omada controller.',
        status: error.response.status,
        raw: error.response.data
      });
      return;
    }
    res.status(500).json({
      error: error.message
    });
  });
});

app.post('/api/voucher-search', function(req, res) {
  var searchKey = req.body && req.body.searchKey ? String(req.body.searchKey).trim() : '';
  if (!searchKey) {
    res.status(400).json({ error: 'Missing searchKey' });
    return;
  }

  var includeAllGroups = Boolean(req.body && req.body.includeAllGroups);
  var groupIds = Array.isArray(req.body && req.body.groupIds) ? req.body.groupIds.filter(Boolean) : [];

  var page = req.body && req.body.page ? Number(req.body.page) : 1;
  if (!page || page < 1) {
    page = 1;
  }

  var pageSize = req.body && req.body.pageSize ? Number(req.body.pageSize) : 10;
  if (!pageSize || pageSize < 1) {
    pageSize = 10;
  }

  var groupMeta = {};

  getAccessToken().then(function(token) {
    var readyGroupsPromise;

    if (includeAllGroups || !groupIds.length) {
      readyGroupsPromise = fetchAllGroupDescriptors(token).then(function(descriptors) {
        if (!descriptors.length) {
          return [DEFAULT_GROUP_ID];
        }

        var seen = {};
        var idList = [];

        descriptors.forEach(function(item) {
          if (item && item.groupId && !seen[item.groupId]) {
            seen[item.groupId] = true;
            groupMeta[item.groupId] = item.groupName || null;
            idList.push(item.groupId);
          }
        });

        return idList;
      });
    } else {
      readyGroupsPromise = Promise.resolve(groupIds);
    }

    return readyGroupsPromise.then(function(resolvedGroupIds) {
      if (!resolvedGroupIds || !resolvedGroupIds.length) {
        resolvedGroupIds = [DEFAULT_GROUP_ID];
      }

      resolvedGroupIds = resolvedGroupIds.filter(Boolean);
      if (!resolvedGroupIds.length) {
        throw new Error('No voucher groups available for search.');
      }

      groupIds = resolvedGroupIds;

      resolvedGroupIds.forEach(function(id) {
        if (!groupMeta[id]) {
          groupMeta[id] = null;
        }
      });

      return Promise.allSettled(resolvedGroupIds.map(function(groupId) {
      return fetchVoucherGroup(token, groupId, {
        page: page,
        pageSize: pageSize,
        searchKey: searchKey
      }).then(function(response) {
        var payload = response.data;
        var extraction = extractVoucherMatches(payload, searchKey);

        return {
          groupId: groupId,
            groupName: groupMeta[groupId] || (payload && payload.result && payload.result.groupName ? payload.result.groupName : undefined),
          data: extraction.sanitized,
          matchCount: extraction.matchCount
        };
      });
      }));
    });
  }).then(function(results) {
    var hits = [];
    var errors = [];

    results.forEach(function(result, index) {
      var groupId = groupIds[index];
      if (result.status === 'fulfilled') {
        var value = result.value;
        if (value && value.matchCount > 0 && value.data) {
          var sanitized = value.data;
          var groupResult = sanitized && sanitized.result ? sanitized.result : null;
          var vouchers = groupResult && Array.isArray(groupResult.data) ? groupResult.data : [];
          var groupDetails = null;

          if (groupResult) {
            groupDetails = {
              id: groupResult.id,
              name: groupResult.name,
              createdTime: groupResult.createdTime,
              creatorName: groupResult.creatorName,
              creatorRole: groupResult.creatorRole,
              limitType: groupResult.limitType,
              limitNum: groupResult.limitNum,
              durationType: groupResult.durationType,
              duration: groupResult.duration,
              timingType: groupResult.timingType,
              rateLimit: groupResult.rateLimit
            };
          }

          hits.push({
            groupId: value.groupId,
            groupName: value.groupName || (groupDetails && groupDetails.name ? groupDetails.name : undefined),
            group: groupDetails,
            vouchers: vouchers
          });
          return;
        }
        return;
      }

      var reason = result.reason;
      var errorPayload = {
        groupId: groupId,
        error: reason && reason.message ? reason.message : 'Request failed'
      };

      if (reason && reason.response) {
        errorPayload.status = reason.response.status;
        errorPayload.raw = reason.response.data;
      }

      errors.push(errorPayload);
    });

    var totalMatches = hits.reduce(function(sum, entry) {
      return sum + (Array.isArray(entry.vouchers) ? entry.vouchers.length : 0);
    }, 0);

    res.json({
      searchKey: searchKey,
      page: page,
      pageSize: pageSize,
      matches: totalMatches,
      hits: hits,
      errors: errors
    });
  }).catch(function(error) {
    if (error.response) {
      res.status(error.response.status || 500).json({
        error: 'Failed to complete voucher search.',
        status: error.response.status,
        raw: error.response.data
      });
      return;
    }

    res.status(500).json({
      error: error.message
    });
  });
});

app.post('/api/voucher-detail', function(req, res) {
  var voucherId = req.body && req.body.voucherId ? String(req.body.voucherId).trim() : '';
  if (!voucherId) {
    res.status(400).json({ error: 'Missing voucherId' });
    return;
  }

  getAccessToken().then(function(token) {
    return fetchVoucherDetail(token, voucherId);
  }).then(function(response) {
    res.json(response.data);
  }).catch(function(error) {
    if (error.response) {
      res.status(error.response.status || 500).json({
        error: 'Failed to fetch voucher detail from Omada controller.',
        status: error.response.status,
        raw: error.response.data
      });
      return;
    }

    res.status(500).json({
      error: error.message
    });
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, function() {
  console.log('Omada proxy server running on port ' + PORT);
});
