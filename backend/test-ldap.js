const ldap = require('ldapjs');

const client = ldap.createClient({
  url: 'ldaps://ADLDAP.IN.RIL.COM:636',
  tlsOptions: {
    rejectUnauthorized: false
  }
});

const bindDN = 'CN=seco.stsit,OU=SERVICEACCT,DC=in,DC=ril,DC=com';
const bindPassword = 'L7secure$0@';

const baseDN = 'DC=in,DC=ril,DC=com';
const searchFilter = '(sAMAccountName=kiran1.veer)';

client.bind(bindDN, bindPassword, (err) => {
  if (err) {
    console.error('❌ LDAP bind failed:', err.message);
    client.unbind();
    return;
  }

  console.log('✅ LDAP bind successful.');

  client.search(baseDN, { filter: searchFilter, scope: 'sub' }, (err, res) => {
    if (err) {
      console.error('❌ LDAP search error:', err.message);
      client.unbind();
      return;
    }

    res.on('searchEntry', (entry) => {
      try {
        const user = entry.pojo || entry.attributes?.reduce((acc, attr) => {
          acc[attr.type] = attr.vals.length === 1 ? attr.vals[0] : attr.vals;
          return acc;
        }, {}) || 'No attributes found';

        console.log('✅ User entry found:\n', JSON.stringify(user, null, 2));
      } catch (parseErr) {
        console.error('❌ Failed to parse LDAP entry:', parseErr.message);
      }
    });

    res.on('end', (result) => {
      console.log('✅ Search done. Status:', result.status);
      client.unbind();
    });

    res.on('error', (err) => {
      console.error('❌ LDAP search failed:', err.message);
      client.unbind();
    });
  });
});
