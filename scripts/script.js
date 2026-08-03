// Add Anime in the list
async function addAnime(idanime, urlimg, nomnative, nomromaji, nomenglish, languepref, statut, nbsaisons, nbepisodes, saisonencours, epencours, detailsepsaison, checkboxsf, duree, favori, flag) {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    let nompref = "";
    if (languepref == 'EN') {
        nompref = nomenglish;
    } else {
        nompref = nomromaji;
    }
    let film = 0;
    if (checkboxsf==true) {
        film = 1;
    }
    if (nbsaisons=="") {
        nbsaisons = null;
        detailsepsaison = null;
    }
    if (detailsepsaison=="") {
        detailsepsaison = null;
    }
    let detailsadonner = detailsepsaison;
    if (detailsepsaison != null) {
        let newdetailsepsaison = '';
        let lstdetailsepsaison = detailsepsaison.split(',');
        if (lstdetailsepsaison.length != nbsaisons) {
            for (let i = 0; i < nbsaisons; i++) {
                if (i!=0) {
                    newdetailsepsaison += ',';
                }
                newdetailsepsaison += lstdetailsepsaison[i];
            }
            detailsadonner = newdetailsepsaison;
        }
    }
    const { data, error } = await Supabase
        .from(tablename)  
        .insert([{
            idanime: idanime, 
            urlimg: urlimg, 
            nomnative: nomnative, 
            nomromaji: nomromaji, 
            nomenglish: nomenglish, 
            languepref: languepref, 
            nompref: nompref,
            statut: statut, 
            nbsaisons: nbsaisons, 
            nbepisodes: nbepisodes, 
            saisonencours: saisonencours, 
            epencours: epencours, 
            detailsepparsaison: detailsadonner, 
            film: film, 
            duree: duree,
            favori: favori,
            flag: flag
        }])
    if (error) console.error(error);
    
    document.querySelector("tbody").innerHTML = '';
    selectList();
    printCounts();
}

async function getUser(login, mdp) {
    const { data, error } = await Supabase
        .from('users')  
        .select('name')
        .eq('login', login)
        .eq('mdp', mdp);
    if (error) console.error(error);
    console.log(data);
    
    setsess({
        nomsess: "username",
        valsess: data[0].name
    });
}

async function selectList(statsArray = ["toview", "next", "watching", "finished", "waiting", "dropped", "restart", "again"], orderby = "nompref", asc = true) {
    if (!Array.isArray(statsArray)) {
        statsArray = [statsArray];
    }
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const grid = document.querySelector("#gridAnime");
    if (grid) grid.innerHTML = '';
    
    let query = Supabase
        .from(tablename)  
        .select(`id, idanime, urlimg, nomnative, nomromaji, nomenglish, nompref, languepref, statut, nbsaisons, nbepisodes, saisonencours, epencours, detailsepparsaison, film, duree, favori, flag`);
    
        if (statsArray.length > 0){
            query = query.in("statut", statsArray);
        }

        query = query.order(orderby, { ascending: asc });

        if (orderby != "nompref") {
            query = query.order('nompref', { ascending: asc });
        }

    let { data, error } = await query;
    if (error) console.error(error);
    // console.log("SELECT:", datas);

    setsess({
        nomsess: "orderby",
        valsess: orderby
    })
    setsess({
        nomsess: "direction",
        valsess: asc
    })

    if(sessionStorage.getItem('orderby') == 'nompref'){
        setsess({
            nomsess: "letter",
            valsess: ""
        })
    }

    let currentGroup = '';
    data.forEach(data_ => {
        const title = data_.nompref || '';
        const grid = document.querySelector('#gridAnime');
        if (orderby === 'nompref' && grid) {
            const firstChar = title.trim().charAt(0).toUpperCase();
            const group = /[A-Z]/.test(firstChar) ? firstChar : '#';
            if (group !== currentGroup) {
                currentGroup = group;
                const separator = document.createElement('div');
                separator.classList.add('grid-letter-separator');
                separator.textContent = group;
                grid.appendChild(separator);
            }
        }

        addAnimeCard({
            id: data_.id,
            img: data_.urlimg,
            title: data_.nompref,
            saisons: data_.nbsaisons,
            episodes: data_.nbepisodes,
            status: data_.statut,
            saisonencours: data_.saisonencours,
            epencours: data_.epencours,
            film: data_.film,
            duree: data_.duree,
            favori: data_.favori,
            flag: data_.flag
        });
    });   
}

function addAnimeCard({ id, img, title, saisons, episodes, status, saisonencours, epencours, film, duree, favori, flag }) {
    const grid = document.getElementById('gridAnime');
    if (!grid) return;

    const card = document.createElement('div');
    card.classList.add('anime-card');
    if (favori == 1) {
        card.classList.add('selected');
    }
    if (flag == 1) {
        card.dataset.flag = '1';
    }

    const image = document.createElement('img');
    image.src = img;
    image.alt = title;
    card.appendChild(image);

    const cardTop = document.createElement('div');
    cardTop.classList.add('card-top');
    const badge = document.createElement('span');
    if (film == 1) {
        badge.textContent = duree || 'Film';
    } else if (status === 'watching' || status === 'waiting' || status === 'dropped') {
        const currentSeason = saisonencours || 0;
        const currentEpisode = epencours || 0;
        badge.textContent = `S${currentSeason} • Ep ${currentEpisode}`;
    } else {
        const seasonsText = saisons == null || saisons == 0 ? 'Non renseignée' : `${saisons} S`;
        const episodesText = episodes ? `• ${episodes} Ep` : '';
        badge.textContent = `${seasonsText} ${episodesText}`.trim();
    }
    cardTop.appendChild(badge);
    card.appendChild(cardTop);

    const cardBottom = document.createElement('div');
    cardBottom.classList.add('card-bottom');
    const cardTitle = document.createElement('h3');
    cardTitle.textContent = title;
    cardBottom.appendChild(cardTitle);
    card.appendChild(cardBottom);

    card.addEventListener('click', () => {
        showCardInfo({
            id,
            img,
            title,
            saisons,
            episodes,
            status,
            saisonencours,
            epencours,
            film,
            duree,
            favori,
            flag
        });
    });

    grid.appendChild(card);
}

function showCardInfo({ id, img, title, saisons, episodes, status, saisonencours, epencours, film, duree, favori, flag }) {
    const overlay = document.getElementById('cardInfoOverlay');
    if (!overlay) return;

    const image = overlay.querySelector('.card-info-image img');
    const titleEl = overlay.querySelector('.card-info-header h2');
    const statusEl = overlay.querySelector('.card-info-status');
    const detailsEl = overlay.querySelector('.card-info-details');

    image.src = img || '';
    image.alt = title || '';
    titleEl.textContent = title || 'Sans titre';
    statusEl.textContent =
        status === 'toview' ? 'À voir' :
        status === 'next' ? 'Suivant' :
        status === 'watching' ? 'En cours' :
        status === 'finished' ? 'Terminé' :
        status === 'waiting' ? 'En attente' :
        status === 'dropped' ? 'Abandonné' :
        status === 'restart' ? 'Recommencer' :
        status === 'again' ? 'À revoir' :
        status || 'Statut inconnu';

    const rows = [];
    if (film == 1) {
        rows.push({ label: 'Type', value: 'Film' });
        rows.push({ label: 'Durée', value: duree || 'Non renseignée' });
    } else {
        rows.push({ label: 'Saisons', value: saisons || 'Non renseignée' });
        rows.push({ label: 'Épisodes', value: episodes || 'Non renseignés' });
        if (status === 'watching' || status === 'dropped' || status === 'waiting') {
            rows.push({ label: 'Progression', value: `S${saisonencours || 0} • Ep ${epencours || 0}` });
        }
    }
    rows.push({ label: 'Favori', value: favori == 1 ? 'Oui' : 'Non' });
    rows.push({ label: 'Flag', value: flag == 1 ? 'Oui' : 'Non' });

    detailsEl.innerHTML = '';
    rows.forEach(({ label, value }) => {
        const row = document.createElement('div');
        row.className = 'card-info-row';
        row.innerHTML = `<span>${label}</span><span>${value}</span>`;
        detailsEl.appendChild(row);
    });

    overlay.dataset.cardId = id;
    overlay.classList.remove('hidden');
}

function hideCardInfo() {
    const overlay = document.getElementById('cardInfoOverlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
}

function openEditFromCardInfo() {
    const overlay = document.getElementById('cardInfoOverlay');
    if (!overlay || !overlay.dataset.cardId) return;
    hideCardInfo();
    editrow(Number(overlay.dataset.cardId));
}

function closeEditModal() {
    const modal = document.getElementById('animeForm-edit');
    if (!modal) return;
    modal.classList.remove('show');
    clearModal2();
}

function updateSeasonInputs(nb = 0, eplist = [], prefix = '') {
    const count = Number(nb) || 0;
    const container = document.getElementById(`seasonInputs${prefix}`);
    if (!container) return;

    container.innerHTML = '';
    if (count <= 0) return;

    const label = document.createElement('label');
    label.textContent = 'Épisodes / saisons';
    container.appendChild(label);

    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.className = 'season-line';
        const value = eplist && eplist[i - 1] ? eplist[i - 1] : '';
        div.innerHTML = `
            <span>Saison ${i} :</span>
            <input type="number" min="1" value="${value}">
        `;
        container.appendChild(div);
    }
}

function updateSeasonInputs2() {
    const count = document.getElementById('seasonCount-edit')?.value;
    const details = document.getElementById('seasonInputs-edit')?.dataset.details;
    const detailList = details ? details.split(',') : [];
    updateSeasonInputs(count, detailList, '-edit');
}

function StatutChange(newval, prefix = '') {
    const currentValues = document.getElementById(`currentsvalues${prefix}`);
    const champSaison = document.getElementById(`currentseason${prefix}`);
    const champEp = document.getElementById(`currentep${prefix}`);

    if (!currentValues) return;

    if (newval === 'watching' || newval === 'waiting' || newval === 'dropped') {
        currentValues.style.display = 'flex';
    } else {
        currentValues.style.display = 'none';
        if (champSaison) champSaison.value = null;
        if (champEp) champEp.value = null;
    }
}

function StatutChange2(newval) {
    StatutChange(newval, '-edit');
}

function sfChange(prefix = '') {
    const checkbox = document.getElementById(`checkboxsf${prefix}`);
    const divDuree = document.getElementById(`divduree${prefix}`);
    const divNbsaison = document.getElementById(`divnbsaison${prefix}`);
    const seasonCount = document.getElementById(`seasonCount${prefix}`);

    if (!checkbox || !divDuree || !divNbsaison) return;

    if (checkbox.checked) {
        divDuree.style.display = 'flex';
        divNbsaison.style.display = 'none';
        if (seasonCount) {
            seasonCount.value = '';
            updateSeasonInputs(0, [], prefix);
        }
    } else {
        divDuree.style.display = 'none';
        divNbsaison.style.display = 'flex';
    }
}

function editBtnClick() {
    const rowid = document.getElementById('rowid').value;
    const urlimg = document.getElementById('imgURL-edit').value;
    const nomnative = document.getElementById('titrenatif-edit').value;
    const nomromaji = document.getElementById('titrermji-edit').value;
    const nomenglish = document.getElementById('titreen-edit').value;
    const languepref = document.getElementById('languepref-edit').value;
    const statut = document.getElementById('statut-edit').value;
    const nbsaisons = document.getElementById('seasonCount-edit').value;
    const saisonencours = document.getElementById('currentseason-edit').value;
    const epencours = document.getElementById('currentep-edit').value;
    const checkboxsf = document.getElementById('checkboxsf-edit').checked;
    const duree = document.getElementById('duree-edit').value;
    const divs = document.querySelectorAll('#animeForm-edit .season-line');
    const champ_favori = document.getElementById('favorite-edit');
    const champ_flag = document.getElementById('flag-edit');

    let favori = champ_favori?.checked ? 1 : 0;
    let flag = champ_flag?.checked ? 1 : 0;

    let detailsepsaison = '';
    divs.forEach(div => {
        const input = div.querySelector('input');
        if (!input) return;
        const valeurInput = input.value;
        if (detailsepsaison !== '') detailsepsaison += ',';
        detailsepsaison += String(valeurInput);
    });

    let nbepisodes = 0;
    divs.forEach(div => {
        const input = div.querySelector('input');
        if (!input) return;
        const value = Number(input.value) || 0;
        nbepisodes += value;
    });

    const id = Number(rowid);
    updaterow(id, nomnative, nomromaji, nomenglish, languepref, statut, nbsaisons, nbepisodes, saisonencours, epencours, detailsepsaison, checkboxsf, duree, favori, flag);
    closeEditModal();

    setTimeout(() => {
        selectList();
        clearModal2();
        sfChange('-edit');
    }, 500);
}

function delBtnClick() {
    const rowid = document.getElementById('rowid').value;
    const nomromaji = document.getElementById('titrermji-edit').value;
    const nomenglish = document.getElementById('titreen-edit').value;
    const languepref = document.getElementById('languepref-edit').value;

    let nomanime = nomenglish;
    if (languepref === 'NA') {
        nomanime = nomromaji;
    }
    if (confirm('Supprimer ' + nomanime + ' ?')) {
        deleteRow(rowid);
        closeEditModal();
        setTimeout(() => {
            selectList();
            clearModal2();
            sfChange('-edit');
        }, 500);
    }
}

function clearModal() {
    document.getElementById('titreSearch').value = '';
    document.getElementById('imgURL').value = '';
    document.getElementById('titrenatif').value = '';
    document.getElementById('titrermji').value = '';
    document.getElementById('titreen').value = '';
    document.getElementById('languepref').value = 'EN';
    document.getElementById('statut').value = 'toview';
    StatutChange('toview');
    // document.getElementById('statut').value = 'finished';
    // StatutChange('finished');
    document.getElementById('seasonCount').value = '';
    document.getElementById('seasonInputs').innerHTML = '';
    document.getElementById('previewImg').style.display = 'none';
    document.getElementById('checkboxsf').checked = false;
    document.getElementById('duree').value = '00:00';

    const divs = document.querySelectorAll('.season-line');
    divs.forEach(div => {
        div.querySelector('input').value = '';
    });

    updateSeasonInputs();
    sfChange();
    getIfAnimeExist(0);
}

function clearModal2() {
    document.getElementById('imgURL-edit').value = '';
    document.getElementById('titrenatif-edit').value = '';
    document.getElementById('titrermji-edit').value = '';
    document.getElementById('titreen-edit').value = '';
    document.getElementById('languepref-edit').value = 'EN';
    document.getElementById('statut-edit').value = 'toview';
    StatutChange2('toview');
    document.getElementById('seasonCount-edit').value = '';
    document.getElementById('previewImg-edit').style.display = 'none';
    document.getElementById('checkboxsf-edit').checked = false;
    document.getElementById('duree-edit').value = '00:00';
    updateSeasonInputs(0, [], '-edit');
    sfChange('-edit');
}

async function login (login, mdp) {
    await getUser(login, CryptoJS.SHA1(mdp).toString());
    if (sessionStorage.getItem('username') != null || sessionStorage.getItem('username') != "undefined") {
        window.location = "index.html";
    }
}

function setsess({ nomsess, valsess}){
    sessionStorage.setItem(nomsess, valsess);
}

async function getrowinfos(id) {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { data, error } = await Supabase
        .from(tablename)  
        .select('*')
        .eq('id', id)
    if (error) console.error(error);
    let data_ = data[0];

    changerowvalues({
        id: data_.id,
        idanime: data_.idanime,
        urlimg: data_.urlimg,
        nomnative: data_.nomnative,
        nomromaji: data_.nomromaji,
        nomenglish: data_.nomenglish,
        languepref: data_.languepref,
        statut: data_.statut,
        nbsaisons: data_.nbsaisons,
        nbepisodes: data_.nbepisodes,
        saisonencours: data_.saisonencours,
        epencours: data_.epencours,
        detailsepparsaison: data_.detailsepparsaison,
        film: data_.film,
        duree: data_.duree,
        favori: data_.favori,
        flag: data_.flag
       });
}

function editrow(id) {
    document.getElementById('animeForm-edit').classList.add("show");
    getrowinfos(id);
}

function changerowvalues({id, idanime, urlimg, nomnative, nomromaji, nomenglish, languepref, statut, nbsaisons, nbepisodes, saisonencours, epencours, detailsepparsaison, film, duree, favori, flag}){
    const rowid = document.getElementById('rowid');
    const champ_imgurl = document.getElementById('imgURL-edit');
    const champ_urlimg = document.getElementById('previewImg-edit');
    const champ_nomnative = document.getElementById('titrenatif-edit');
    const champ_nomromaji = document.getElementById('titrermji-edit');
    const champ_nomenglish = document.getElementById('titreen-edit');
    const champ_languepref = document.getElementById('languepref-edit');
    const champ_statut = document.getElementById('statut-edit');
    const champ_nbsaisons = document.getElementById('seasonCount-edit');
    const div_nbsaisons = document.getElementById('divnbsaison-edit');
    const champ_saisonencours = document.getElementById('currentseason-edit');
    const champ_epencours = document.getElementById('currentep-edit');
    const champ_film = document.getElementById('checkboxsf-edit');
    const champ_duree = document.getElementById('duree-edit');
    const div_duree = document.getElementById('divduree-edit');
    const divsseasonInputs = document.getElementById('seasonInputs-edit');
    const divcurrentsvalues = document.getElementById('currentsvalues-edit');
    const champ_favori = document.getElementById('favorite-edit');
    const champ_flag = document.getElementById('flag-edit');

    if (favori == 1) {
        champ_favori.checked = true;
    }
    else {
        champ_favori.checked = false;
    }

    if (flag == 1) {
        champ_flag.checked = true;
    }
    else {
        champ_flag.checked = false;
    }

    rowid.value = id;

    champ_urlimg.src = urlimg;
    if (urlimg == ""){
        champ_urlimg.style.display = 'none';
    }
    else{
        champ_urlimg.style.display = 'block';
    }
    champ_nomnative.value = nomnative;
    champ_nomromaji.value = nomromaji;
    champ_nomenglish.value = nomenglish;
    champ_languepref.value = languepref;

    champ_statut.value = statut;
    if (statut == "watching" || statut == "waiting" || statut == "dropped") {
        divcurrentsvalues.style.display = 'block';
        champ_saisonencours.value = saisonencours;
        champ_epencours.value = epencours;   
    } else {
        divcurrentsvalues.style.display = 'none';
    }

    if (detailsepparsaison != null) {
        detailsepparsaison = detailsepparsaison.split(",")
    } else {
        detailsepparsaison = [];
    }

    divsseasonInputs.dataset.details = detailsepparsaison.join(",");
    champ_film.checked = film;
    if (film === 1) {
        div_nbsaisons.style.display = 'none';
        divsseasonInputs.style.display = 'none';
        div_duree.style.display = 'block';
        champ_duree.value = duree;
    } else {
        div_nbsaisons.style.display = 'block';
        divsseasonInputs.style.display = 'block';
        div_duree.style.display = 'none';
        champ_nbsaisons.value = nbsaisons;
        addSeasonInputs(nbsaisons, detailsepparsaison);
    }
}

function addSeasonInputs(nb, eplist) {
    const count = parseInt(nb);
    const divsseasonInputs = document.getElementById('seasonInputs-edit');
    
    divsseasonInputs.innerHTML = "";

    if (count > 0) {
        divsseasonInputs.innerHTML = "<label>Épisodes / saisons</label>";
        for (let i = 1; i <= count; i++) {
            const div = document.createElement("div");
            div.classList.add("season-line");
            div.innerHTML = `
                <span>Saison ${i} :</span>
                <input type="number" min="1" value="${eplist ? eplist[i-1] : ''}">
            `;
            divsseasonInputs.appendChild(div);
        }
    }
}

async function updaterow(id, nomnative, nomromaji, nomenglish, languepref, statut, nbsaisons, nbepisodes, saisonencours, epencours, detailsepparsaison, film, duree, favori, flag) {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    let nompref = "";
    if (languepref == 'EN') {
        nompref = nomenglish;
    } else {
        nompref = nomromaji;
    }
    console.log(nompref);
    let film_ = 0;
    if (film == true) {
        film_ = 1;
    }
    if (nbsaisons=="") {
        nbsaisons = null;
        detailsepparsaison = null;
    }
    if (detailsepparsaison=="") {
        detailsepparsaison = null;
    }
    const { data, error } = await Supabase
        .from(tablename)  
        .update({
            nomnative: nomnative, 
            nomromaji: nomromaji, 
            nomenglish: nomenglish, 
            languepref: languepref, 
            nompref: nompref,
            statut: statut, 
            nbsaisons: nbsaisons, 
            nbepisodes: nbepisodes, 
            saisonencours: saisonencours, 
            epencours: epencours, 
            detailsepparsaison: detailsepparsaison, 
            film: film_, 
            duree: duree,
            favori: favori,
            flag: flag
        })
        .eq('id', id)
    if (error) console.error(error);
    printCounts();
    printCounts();
}

function addLetterInTab(letter) {
    const table = document.querySelector("tbody"); // ton tableau doit avoir id="animeTable"
    // Création de la ligne
    const tr = document.createElement("tr");
    tr.classList.add('letter-separator');

    const tdLetter = document.createElement('td')
    tdLetter.colSpan = "5";
    tdLetter.innerHTML = letter;

    tr.appendChild(tdLetter);

    table.appendChild(tr);
}

async function getcountrows() {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { count, error } = await Supabase
        .from(tablename)  
        .select('*', {count:'exact',head:true});
    if (error) console.error(error);
    
    sessionStorage.removeItem('nbrows');
    setsess({
        nomsess: "nbrows",
        valsess: count
    });
}

async function getcountrowsfinished() {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { count, error } = await Supabase
        .from(tablename)  
        .select('*', {count:'exact', head:true})
        .eq('statut', 'finished');
    if (error) console.error(error);
    document.getElementById('cptfinish').innerHTML = count + "/" + sessionStorage.getItem('nbrows') + " Terminés";
}

async function getcountrowswatching() {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { count, error } = await Supabase
        .from(tablename)  
        .select('*', {count:'exact',head:true})
        .eq('statut', 'watching');
    if (error) console.error(error);
    document.getElementById('cptcurrent').innerHTML = count + " En Cours";
}

function printCounts() {
    getcountrows();
    getcountrowswatching();
    getcountrowsfinished();
}

async function deleteRow(id) {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { data, error } = await Supabase
        .from(tablename)  
        .delete()
        .eq('id', id);
    if (error) console.error(error);
}

async function nextep(id) {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { data, error } = await Supabase
        .from(tablename)  
        .select('nbsaisons, nbepisodes, saisonencours, epencours, detailsepparsaison')
        .eq('id', id);
    if (error) console.error(error);
    let datas = data[0];

    let currentep = datas.epencours;
    let currentsaison = datas.saisonencours;
    let details = datas.detailsepparsaison.split(',');
    let newstatus = 'watching';

    currentep += 1;
    if (datas.detailsepparsaison != null) {
        if (currentep > details[currentsaison-1] && currentsaison < details.length) {
            currentep = 1;
            currentsaison += 1;
        }
        if (currentep > details[currentsaison-1] && currentsaison == details.length) {
            currentep -= 1;
            newstatus = 'finished';
        }
    }

    updateEp(id, currentep, currentsaison, newstatus);
}

async function updateEp(id, ep, saison, status) {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { data, error } = await Supabase
        .from(tablename)  
        .update({
            statut: status, 
            saisonencours: saison, 
            epencours: ep
        })
        .eq('id', id)
    if (error) console.error(error);
    printCounts();
    selectList();
}

async function getIfAnimeExist(idanime) {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { data, error } = await Supabase
        .from(tablename)  
        .select('id')
        .eq('idanime', idanime);
    if (error) console.error(error);
    if (data[0] != undefined) {
        document.getElementById('warninginlist').style.display = 'block';
    }
    else{
        document.getElementById('warninginlist').style.display = 'none';
    }
}

// Search view helpers
function clearSearchResults(message = 'Commencez une recherche pour afficher les résultats.') {
    const results = document.getElementById('searchResults');
    const empty = document.getElementById('searchEmpty');
    if (!results || !empty) return;
    results.innerHTML = '';
    empty.textContent = message;
    empty.style.display = 'block';
}

function renderSearchResults(items) {
    const results = document.getElementById('searchResults');
    const empty = document.getElementById('searchEmpty');
    if (!results || !empty) return;
    results.innerHTML = '';
    if (!items.length) {
        empty.textContent = 'Aucun résultat trouvé.';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    items.forEach(item => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'search-result-item';
        row.innerHTML = `
            <div class="search-result-art">
                <img src="${item.coverImage || 'https://via.placeholder.com/120x168?text=No+Image'}" alt="${item.title}" loading="lazy">
            </div>
            <div class="search-result-content">
                <span class="search-result-title">${item.title || 'Titre inconnu'}</span>
                <span class="search-result-subtitle">${item.subtitle || ''}</span>
            </div>
        `;
        results.appendChild(row);
    });
}

async function searchAnime(query) {
    if (!query) {
        clearSearchResults();
        return;
    }

    const gql = `query ($search: String) {
        Page(perPage: 12) {
            media(search: $search, type: ANIME) {
                id
                title {
                    romaji
                    english
                    native
                }
                coverImage {
                    medium
                    large
                }
                seasonYear
                episodes
            }
        }
    }`;

    const variables = { search: query };

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ query: gql, variables })
        });
        const data = await response.json();
        const media = data?.data?.Page?.media || [];
        const items = media.map(anime => ({
            title: anime.title.english || anime.title.romaji || anime.title.native || 'Sans titre',
            subtitle: anime.seasonYear ? `${anime.seasonYear} • ${anime.episodes || '?'} Ep` : `${anime.episodes || '?'} Ep`,
            coverImage: anime.coverImage?.medium || anime.coverImage?.large || ''
        }));
        renderSearchResults(items);
    } catch (err) {
        console.error('Erreur recherche AniList :', err);
        clearSearchResults('Erreur lors de la recherche. Réessayez.');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchQuery');
    if (!searchInput) return;

    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchAnime(searchInput.value.trim());
        }, 300);
    });
});

