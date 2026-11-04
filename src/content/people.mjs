import ronja from './people/ronja-donsbach.json' with {type:'json'};
import florian from './people/florian-becker.json' with {type:'json'};
import erwin from './people/erwin-wilms.json' with {type:'json'};
import patrick from './people/patrick.json' with {type:'json'};
import alejandro from './people/alejandro.json' with {type:'json'};
import chopper from './people/chopper.json' with {type:'json'};
import {personSchema} from '../schemas/person.mjs';
const records={'ronja-donsbach':ronja, 'florian-becker':florian, 'erwin-wilms':erwin, 'patrick':patrick, 'alejandro':alejandro, 'chopper':chopper};
export const PEOPLE=Object.fromEntries(Object.entries(records).map(([id,data])=>[id,personSchema.parse(data)]));
export const PERSON_IDS=Object.keys(PEOPLE);
export function person(id,source=PEOPLE){const value=source[id];if(!Object.hasOwn(source,id))throw Error('Unbekannte Person: '+id);return {...value,id,image:value.image?{...value.image,alt:value.name}:undefined};}
export function portraitPerson(id,source=PEOPLE){const value=person(id,source);if(!value.image)throw Error('Porträt fehlt: '+id);return {...value,image:value.image};}
export const FOUNDERS=PERSON_IDS.filter(id=>PEOPLE[id].founder).sort((a,b)=>PEOPLE[a].order-PEOPLE[b].order).map(id=>portraitPerson(id));
export function teamMember(member,source=PEOPLE,locale='de'){const p=person(member.personId,source);if(!Object.hasOwn(p.bio,locale))throw Error('Unbekannte Personensprache: '+locale);return {...member,...p,role:p.role[locale],bio:p.bio[locale],image:p.image?{...p.image,alt:p.imageAlt?.[locale]??p.name}:undefined};}
