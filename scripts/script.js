// Add Anime in the list
function showAppToast(message, type = 'info') {
    const toast = document.getElementById('appToast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `app-toast ${type} visible`;
    window.clearTimeout(showAppToast.timeout);
    showAppToast.timeout = window.setTimeout(() => toast.classList.remove('visible'), 3600);
}

function showConfirmDialog(message, title = 'Confirmer l’action', acceptLabel = 'Confirmer') {
    return new Promise(resolve => {
        const dialog = document.getElementById('confirmDialog');
        const titleEl = document.getElementById('confirmDialogTitle');
        const messageEl = document.getElementById('confirmDialogMessage');
        const cancel = document.getElementById('confirmCancel');
        const accept = document.getElementById('confirmAccept');
        if (!dialog || !titleEl || !messageEl || !cancel || !accept) {
            resolve(false);
            return;
        }
        titleEl.textContent = title;
        messageEl.textContent = message;
        accept.textContent = acceptLabel;
        dialog.hidden = false;
        const close = result => {
            dialog.hidden = true;
            cancel.removeEventListener('click', onCancel);
            accept.removeEventListener('click', onAccept);
            resolve(result);
        };
        const onCancel = () => close(false);
        const onAccept = () => close(true);
        cancel.addEventListener('click', onCancel);
        accept.addEventListener('click', onAccept);
        cancel.focus();
    });
}

async function addAnime(idanime, urlimg, nomnative, nomromaji, nomenglish, languepref, statut, nbsaisons, nbepisodes, saisonencours, epencours, detailsepsaison, checkboxsf, duree, favori, flag, caption = '') {
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

    let duplicateFound = false;
    let duplicateQuery = Supabase.from(tablename).select('id');
    if (Number(idanime) > 0) {
        duplicateQuery = duplicateQuery.eq('idanime', idanime);
    } else {
        duplicateQuery = duplicateQuery.eq('nompref', nompref);
    }
    const { data: duplicates, error: duplicateError } = await duplicateQuery;
    if (!duplicateError) {
        duplicateFound = Boolean(duplicates?.length);
    }

    if (duplicateFound) {
        const shouldContinue = await showConfirmDialog(
            `« ${nompref} » est déjà présent dans ta liste. Voulais-tu vraiment l’ajouter une seconde fois ?`,
            'Doublon détecté',
            'Ajouter quand même'
        );
        if (!shouldContinue) {
            showAppToast('Ajout annulé.', 'info');
            return false;
        }
    }

    const payload = {
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
            flag: flag,
            caption: caption
        };
    let { data, error } = await Supabase.from(tablename).insert([payload]);
    if (error && (error.code === '42703' || error.code === 'PGRST204')) {
        delete payload.caption;
        ({ data, error } = await Supabase.from(tablename).insert([payload]));
        if (!error && caption) showAppToast('Anime ajouté, mais le synopsis nécessite la colonne caption.', 'warning');
    }
    if (error) {
        console.error(error);
        showAppToast('Impossible d’ajouter cet anime. Réessaie.', 'error');
        return false;
    }
    
    // document.querySelector("tbody").innerHTML = '';
    const activeFilter = sessionStorage.getItem('currentListFilter') || currentFilterValue;
    currentFilterValue = activeFilter;
    selectList(parseFilter(activeFilter));
    printCounts();
    showAppToast('Anime ajouté à ta liste.', 'success');
    return true;
}

function openManualAddModal() {
    const modal = document.getElementById('animeForm-manual');
    if (!modal) return;
    modal.classList.add('show');
    document.getElementById('manual-title')?.focus();
}

function closeManualAddModal() {
    const modal = document.getElementById('animeForm-manual');
    if (!modal) return;
    modal.classList.remove('show');
    clearManualAddForm();
}

function toggleManualTypeFields() {
    const isFilm = document.getElementById('manual-is-film')?.checked;
    const episodesGroup = document.getElementById('manual-episodes-group');
    const durationGroup = document.getElementById('manual-duration-group');
    if (!episodesGroup || !durationGroup) return;
    episodesGroup.style.display = isFilm ? 'none' : 'flex';
    durationGroup.style.display = isFilm ? 'flex' : 'none';
}

function clearManualAddForm() {
    const form = document.getElementById('manualAddForm');
    const preview = document.getElementById('manual-image-preview');
    const previewWrap = document.getElementById('manual-image-preview-wrap');
    if (form) form.reset();
    if (preview) {
        preview.removeAttribute('src');
    }
    if (previewWrap) previewWrap.classList.remove('has-image');
    toggleManualTypeFields();
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function getManualImageValue() {
    const file = document.getElementById('manual-image-file')?.files?.[0];
    const url = document.getElementById('manual-image-url')?.value.trim() || '';
    if (!file) return url;
    // Un site statique ne peut pas écrire dans le dossier du dépôt : l’image reste donc dans la donnée enregistrée.
    return readFileAsDataUrl(file);
}

async function submitManualAdd() {
    const title = document.getElementById('manual-title')?.value.trim();
    const isFilm = document.getElementById('manual-is-film')?.checked || false;
    const episodes = Number(document.getElementById('manual-episodes')?.value) || 0;
    const duration = document.getElementById('manual-duration')?.value || '00:00';
    const favori = document.getElementById('manual-favorite')?.checked ? 1 : 0;
    const flag = document.getElementById('manual-flag')?.checked ? 1 : 0;

    if (!title) {
        document.getElementById('manual-title')?.focus();
        return;
    }
    if (!isFilm && episodes < 1) {
        document.getElementById('manual-episodes')?.focus();
        return;
    }
    if (isFilm && duration === '00:00') {
        document.getElementById('manual-duration')?.focus();
        return;
    }

    const imageUrl = await getManualImageValue();

    const addButton = document.querySelector('#animeForm-manual .add');
    if (addButton) {
        addButton.disabled = true;
        addButton.textContent = 'Ajout...';
    }
    const added = await addAnime(
        0,
        imageUrl,
        title,
        title,
        title,
        'EN',
        'toview',
        1,
        isFilm ? 0 : episodes,
        0,
        0,
        null,
        isFilm,
        isFilm ? `${duration}:00` : '00:00:00',
        favori,
        flag
    );
    if (addButton) {
        addButton.disabled = false;
        addButton.textContent = 'Ajouter';
    }
    if (!added) return;
    closeManualAddModal();
}

async function getUser(login, mdp) {
    const { data, error } = await Supabase
        .from('users')  
        .select('name')
        .eq('login', login)
        .eq('mdp', mdp);
    if (error) {
        console.error(error);
        return false;
    }
    if (!data || !data[0]) return false;
    
    setsess({
        nomsess: "username",
        valsess: data[0].name
    });
    return true;
}

async function selectList(statsArray = ["toview", "next", "watching", "finished", "waiting", "dropped", "restart", "again"], orderby = "nompref", asc = true) {
    if (!Array.isArray(statsArray)) {
        statsArray = [statsArray];
    }
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const grid = document.querySelector("#gridAnime");
    if (grid) {
        grid.innerHTML = '';
        grid.setAttribute('aria-busy', 'true');
        const appendSkeletonCards = count => {
            for (let index = 0; index < count; index++) {
                const skeleton = document.createElement('div');
                skeleton.className = 'anime-card anime-card-skeleton';
                skeleton.setAttribute('aria-hidden', 'true');
                skeleton.innerHTML = '<span class="skeleton-shine"></span><span class="skeleton-title"></span>';
                grid.appendChild(skeleton);
            }
        };
        const appendSkeletonSeparator = () => {
            const separator = document.createElement('div');
            separator.className = 'grid-letter-separator skeleton-separator';
            separator.setAttribute('aria-hidden', 'true');
            grid.appendChild(separator);
        };

        appendSkeletonCards(2);
        appendSkeletonSeparator();
        appendSkeletonCards(5);
        appendSkeletonSeparator();
        appendSkeletonCards(3);
        appendSkeletonSeparator();
        appendSkeletonCards(4);
        appendSkeletonSeparator();
        appendSkeletonCards(2);
        appendSkeletonSeparator();
        appendSkeletonCards(4);
    }
    
    let query = Supabase
        .from(tablename)  
        .select(`id, idanime, urlimg, nomnative, nomromaji, nomenglish, nompref, languepref, statut, nbsaisons, nbepisodes, saisonencours, epencours, detailsepparsaison, film, duree, favori, flag`);
    
        if (statsArray.length > 0 && !statsArray.includes('favorite') && !statsArray.includes('flag')){
            query = query.in("statut", statsArray);
        }

        if (statsArray.length === 1 && statsArray[0] === 'favorite') {
            query = query.eq('favori', 1);
        }
        if (statsArray.length === 1 && statsArray[0] === 'flag') {
            query = query.eq('flag', 1);
        }

        query = query.order(orderby, { ascending: asc });

        if (orderby != "nompref") {
            query = query.order('nompref', { ascending: asc });
        }

    let { data, error } = await query;
    if (error) {
        console.error(error);
        showAppToast('Impossible de charger cette liste.', 'error');
    }

    let recentItems = [];
    if (grid && !error) {
        const recentQuery = await Supabase
            .from(tablename)
            .select(`id, idanime, urlimg, nompref, statut, nbsaisons, nbepisodes, saisonencours, epencours, film, duree, favori, flag`)
            .order('id', { ascending: false })
            .limit(6);
        if (!recentQuery.error) {
            recentItems = recentQuery.data || [];
        }
    }

    if (grid) {
        grid.innerHTML = '';
        grid.setAttribute('aria-busy', 'false');
    }

    if (grid && recentItems.length) {
            const recentSection = document.createElement('section');
            recentSection.className = 'recent-section';
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'recent-toggle';
            toggle.setAttribute('aria-expanded', 'false');
            toggle.innerHTML = '<span>Récemment ajoutés</span><span class="material-symbols-rounded">expand_more</span>';
            const recentList = document.createElement('div');
            recentList.className = 'recent-list';
            recentItems.forEach(item => addAnimeCard({
                id: item.id, img: item.urlimg, title: item.nompref, saisons: item.nbsaisons,
                episodes: item.nbepisodes, status: item.statut, saisonencours: item.saisonencours,
                epencours: item.epencours, film: item.film, duree: item.duree,
                favori: item.favori, flag: item.flag
            }, recentList));
            toggle.addEventListener('click', () => {
                const expanded = recentSection.classList.toggle('expanded');
                toggle.setAttribute('aria-expanded', String(expanded));
                toggle.querySelector('.material-symbols-rounded').textContent = expanded ? 'expand_less' : 'expand_more';
            });
            recentSection.append(toggle, recentList);
            grid.appendChild(recentSection);
    }
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
    (data || []).forEach(data_ => {
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
            flag: data_.flag,
            caption: data_.caption
        });
    });   
}

function addAnimeCard({ id, img, title, saisons, episodes, status, saisonencours, epencours, film, duree, favori, flag, caption }, targetGrid = null) {
    const grid = targetGrid || document.getElementById('gridAnime');
    if (!grid) return;

    const card = document.createElement('div');
    card.classList.add('anime-card');
    if (favori == 1) {
        card.classList.add('selected');
        card.classList.add('is-favorite');
    }
    if (flag == 1) {
        card.dataset.flag = '1';
        card.classList.add('is-flagged');
    }

    const image = document.createElement('img');
    image.src = img;
    image.alt = title;
    card.appendChild(image);

    const cardTop = document.createElement('div');
    cardTop.classList.add('card-top');

    const badges = document.createElement('div');
    badges.classList.add('card-badges');

    if (favori == 1) {
        const favoriteBadge = document.createElement('span');
        favoriteBadge.className = 'card-badge favorite';
        favoriteBadge.textContent = '★';
        badges.appendChild(favoriteBadge);
    }

    if (flag == 1) {
        const flagBadge = document.createElement('span');
        flagBadge.className = 'card-badge flag';
        flagBadge.textContent = '⚑';
        badges.appendChild(flagBadge);
    }

    if (badges.children.length) {
        cardTop.appendChild(badges);
    }

    const badge = document.createElement('span');
    if (film == 1) {
        badge.textContent = duree || 'Film';
    } else if (status === 'watching' && episodes) {
        const currentEpisode = Number(epencours) || 0;
        badge.textContent = `${currentEpisode} / ${episodes} Ep`;
    } else {
        badge.textContent = episodes ? `${episodes} Ep` : 'Épisodes inconnus';
    }
    cardTop.appendChild(badge);
    card.appendChild(cardTop);

    const cardBottom = document.createElement('div');
    cardBottom.classList.add('card-bottom');
    if (status === 'dropped') {
        const statusBadge = document.createElement('span');
        statusBadge.className = 'card-status card-status-dropped';
        statusBadge.textContent = 'Abandonné';
        cardBottom.appendChild(statusBadge);
    }
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
            flag,
            caption
        });
    });

    grid.appendChild(card);
}

function showCardInfo({ id, img, title, saisons, episodes, status, saisonencours, epencours, film, duree, favori, flag, caption }, options = {}) {
    const { isSearchResult = false, searchData = null } = options;
    const overlay = document.getElementById('cardInfoOverlay');
    if (!overlay) return;

    const image = overlay.querySelector('.card-info-image img');
    const titleEl = overlay.querySelector('.card-info-header h2');
    const statusEl = overlay.querySelector('.card-info-status');
    const detailsEl = overlay.querySelector('.card-info-details');
    const addButton = overlay.querySelector('.card-info-add-btn');
    const progressButton = overlay.querySelector('.card-info-progress-btn');
    const editButton = overlay.querySelector('.card-info-edit-btn');

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

    const effectiveType = (searchData?.type === 'Film' || film == 1) ? 'Film' : 'Série';
    const durationValue = Number(searchData?.duration || duree || 0);
    const episodeValue = Number(searchData?.nbepisodes || episodes || 0);

    const rows = [];
    rows.push({ label: 'Type', value: effectiveType });
    if (effectiveType === 'Film') {
        rows.push({ label: 'Durée', value: durationValue ? `${durationValue} min` : 'Non renseignée' });
    } else {
        rows.push({ label: 'Épisodes', value: episodeValue ? `${episodeValue} Ep` : 'Non renseignés' });
        if (status === 'watching' || status === 'dropped' || status === 'waiting') {
            rows.push({ label: 'Progression', value: `Ep ${epencours || 0}` });
        }
    }
    rows.push({ label: 'Nom japonais romaji', value: searchData?.romajiTitle || title || 'Non renseigné' });
    rows.push({ label: 'Nom japonais natif', value: searchData?.nativeTitle || 'Non renseigné' });
    if (searchData?.description || caption) {
        rows.push({ label: 'Synopsis', value: searchData?.description || caption });
    }

    detailsEl.innerHTML = '';
    rows.forEach(({ label, value }) => {
        const row = document.createElement('div');
        row.className = 'card-info-row';
        row.innerHTML = `<span>${label}</span><span>${value}</span>`;
        detailsEl.appendChild(row);
    });

    if (isSearchResult && addButton) {
        addButton.classList.remove('hidden');
        if (editButton) editButton.classList.add('hidden');
        if (progressButton) progressButton.classList.add('hidden');
        addButton.disabled = false;
            addButton.textContent = 'Ajouter à la liste';
        addButton.onclick = async () => {
            addButton.disabled = true;
            addButton.textContent = 'Ajout...';
            const nbepisodes = Number(searchData?.nbepisodes || episodes || 0);
            const languepref = 'EN';
            const statut = 'toview';
            const nbsaisons = 1;
            const detailsepsaison = '';
            const isMovie = (searchData?.type === 'Film') || (film == 1);
            const dureeVal = isMovie ? (Number(searchData?.duration || duree || 0) || '00:00:00') : '00:00:00';
            const filmFlag = isMovie ? true : false;
            const added = await addAnime(
                searchData?.id || id,
                searchData?.coverImage || img || '',
                searchData?.nativeTitle || '',
                searchData?.romajiTitle || title || '',
                searchData?.englishTitle || title || '',
                languepref,
                statut,
                nbsaisons,
                nbepisodes,
                0,
                0,
                detailsepsaison,
                filmFlag,
                dureeVal,
                0,
                0,
                searchData?.description || ''
            );
            addButton.textContent = added ? 'Ajouté' : 'Réessayer';
            addButton.disabled = false;
        };
        overlay.dataset.cardId = '';
    } else {
        if (addButton) addButton.classList.add('hidden');
        if (editButton) editButton.classList.remove('hidden');
        if (progressButton) {
            const canAdvance = film != 1 && status === 'watching';
            const canStart = film != 1 && status === 'toview';
            progressButton.classList.toggle('hidden', !canAdvance && !canStart);
            progressButton.textContent = canStart ? 'Commencer à l’épisode 1' : 'Épisode suivant';
            progressButton.onclick = async () => {
                progressButton.disabled = true;
                const updated = await updateEp(
                    id,
                    canStart ? 1 : (Number(epencours) || 0) + 1,
                    saisonencours || 1,
                    'watching'
                );
                progressButton.disabled = false;
                if (updated) hideCardInfo();
            };
        }
        overlay.dataset.cardId = id;
    }

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

function StatutChange(newval, prefix = '') {
    const currentValues = document.getElementById(`currentsvalues${prefix}`);
    const champEp = document.getElementById(`currentep${prefix}`);

    if (!currentValues) return;

    if (newval === 'watching' || newval === 'waiting' || newval === 'dropped') {
        currentValues.style.display = 'flex';
    } else {
        currentValues.style.display = 'none';
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

async function editBtnClick() {
    const rowid = document.getElementById('rowid').value;
    const urlimg = document.getElementById('imgURL-edit').value;
    const nomnative = document.getElementById('titrenatif-edit').value;
    const nomromaji = document.getElementById('titrermji-edit').value;
    const nomenglish = document.getElementById('titreen-edit').value;
    const languepref = document.getElementById('languepref-edit').value;
    const statut = document.getElementById('statut-edit').value;
    const saisonencours = 0;
    const epencours = document.getElementById('currentep-edit').value;
    const checkboxsf = document.getElementById('checkboxsf-edit').checked;
    const duree = document.getElementById('duree-edit').value;
    const nbepisodes = Number(document.getElementById('seasonCount-edit').value) || 0;
    const champ_favori = document.getElementById('favorite-edit');
    const champ_flag = document.getElementById('flag-edit');

    let favori = champ_favori?.checked ? 1 : 0;
    let flag = champ_flag?.checked ? 1 : 0;
    const id = Number(rowid);
    const nbsaisons = 1;
    const detailsepsaison = null;

    const editButton = document.getElementById('editanime');
    if (editButton) {
        editButton.disabled = true;
        editButton.textContent = 'Modification...';
    }
    const updated = await updaterow(id, nomnative, nomromaji, nomenglish, languepref, statut, nbsaisons, nbepisodes, saisonencours, epencours, detailsepsaison, checkboxsf, duree, favori, flag);
    if (editButton) {
        editButton.disabled = false;
        editButton.textContent = 'Modifier';
    }
    if (!updated) return;
    closeEditModal();

    setTimeout(() => {
        const activeFilter = sessionStorage.getItem('currentListFilter') || currentFilterValue;
        currentFilterValue = activeFilter;
        selectList(parseFilter(activeFilter));
        clearModal2();
        sfChange('-edit');
    }, 500);
}

async function delBtnClick() {
    const rowid = document.getElementById('rowid').value;
    const nomromaji = document.getElementById('titrermji-edit').value;
    const nomenglish = document.getElementById('titreen-edit').value;
    const languepref = document.getElementById('languepref-edit').value;

    let nomanime = nomenglish;
    if (languepref === 'NA') {
        nomanime = nomromaji;
    }
    if (await showConfirmDialog(`Supprimer « ${nomanime} » de ta liste ?`, 'Supprimer cet anime')) {
        const deleted = await deleteRow(rowid);
        if (!deleted) return;
        closeEditModal();
        setTimeout(() => {
            const activeFilter = sessionStorage.getItem('currentListFilter') || currentFilterValue;
            currentFilterValue = activeFilter;
            selectList(parseFilter(activeFilter));
            clearModal2();
            sfChange('-edit');
        }, 500);
    }
}

function persistCurrentListFilter(filterValue) {
    currentFilterValue = filterValue || currentFilterValue;
    sessionStorage.setItem('currentListFilter', currentFilterValue);
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
    document.getElementById('seasonCount').value = '';
    document.getElementById('previewImg').style.display = 'none';
    document.getElementById('checkboxsf').checked = false;
    document.getElementById('duree').value = '00:00';
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
    sfChange('-edit');
}

async function login (login, mdp) {
    const authenticated = await getUser(login, CryptoJS.SHA1(mdp).toString());
    if (authenticated) {
        window.location = "index.html";
    }
    return authenticated;
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
    const champ_epencours = document.getElementById('currentep-edit');
    const champ_film = document.getElementById('checkboxsf-edit');
    const champ_duree = document.getElementById('duree-edit');
    const div_duree = document.getElementById('divduree-edit');
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
        champ_epencours.value = epencours || 0;
    } else {
        divcurrentsvalues.style.display = 'none';
        champ_epencours.value = 0;
    }

    champ_film.checked = film;
    if (film === 1) {
        div_nbsaisons.style.display = 'none';
        div_duree.style.display = 'flex';
        champ_duree.value = duree || '00:00';
    } else {
        div_nbsaisons.style.display = 'flex';
        div_duree.style.display = 'none';
        champ_nbsaisons.value = nbepisodes || 0;
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
    if (nbsaisons == "") {
        nbsaisons = 1;
    }
    if (detailsepparsaison === "") {
        detailsepparsaison = null;
    }
    if (film_ === 1) {
        duree = duree || '00:00:00';
    } else {
        duree = '00:00:00';
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
            nbsaisons: 1,
            nbepisodes: nbepisodes, 
            saisonencours: saisonencours, 
            epencours: epencours, 
            detailsepparsaison: null,
            film: film_, 
            duree: duree,
            favori: favori,
            flag: flag
        })
        .eq('id', id)
    if (error) {
        console.error(error);
        showAppToast('Impossible de modifier cet anime.', 'error');
        return false;
    }
    printCounts();
    showAppToast('Anime modifié.', 'success');
    return true;
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
    if (error) {
        console.error(error);
        showAppToast('Impossible de récupérer le résumé de la liste.', 'error');
        return;
    }
    
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
}

async function loadSettingsSummary() {
    const summary = document.getElementById('settingsWatchedCount');
    const username = sessionStorage.getItem('username');
    if (!summary || !username) return;

    summary.textContent = '- / -';
    const tablename = 'list' + username.toLowerCase();
    const [totalResult, finishedResult, watchingResult, droppedResult] = await Promise.all([
        Supabase.from(tablename).select('*', { count: 'exact', head: true }),
        Supabase.from(tablename).select('*', { count: 'exact', head: true }).eq('statut', 'finished'),
        Supabase.from(tablename).select('*', { count: 'exact', head: true }).eq('statut', 'watching'),
        Supabase.from(tablename).select('*', { count: 'exact', head: true }).eq('statut', 'dropped')
    ]);

    if ([totalResult, finishedResult, watchingResult, droppedResult].some(result => result.error)) {
        [totalResult, finishedResult, watchingResult, droppedResult].forEach(result => {
            if (result.error) console.error(result.error);
        });
        summary.textContent = '- / -';
        return;
    }

    summary.textContent = `${finishedResult.count || 0} / ${totalResult.count || 0}`;
    document.getElementById('settingsTotalCount').textContent = totalResult.count || 0;
    document.getElementById('settingsWatchingCount').textContent = watchingResult.count || 0;
    document.getElementById('settingsFinishedCount').textContent = finishedResult.count || 0;
    document.getElementById('settingsDroppedCount').textContent = droppedResult.count || 0;
}

async function getcountrowswatching() {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { count, error } = await Supabase
        .from(tablename)  
        .select('*', {count:'exact',head:true})
        .eq('statut', 'watching');
    if (error) console.error(error);
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
    if (error) {
        console.error(error);
        showAppToast('Impossible de supprimer cet anime.', 'error');
        return false;
    }
    showAppToast('Anime supprimé.', 'success');
    return true;
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
    if (error) {
        console.error(error);
        showAppToast('Impossible de mettre à jour la progression.', 'error');
        return false;
    }
    printCounts();
    const activeFilter = sessionStorage.getItem('currentListFilter') || currentFilterValue;
    currentFilterValue = activeFilter;
    selectList(parseFilter(activeFilter));
    showAppToast('Progression mise à jour.', 'success');
    return true;
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

let selectedSearchAnime = null;

function renderSearchResults(items) {
    const results = document.getElementById('searchResults');
    const empty = document.getElementById('searchEmpty');
    const details = document.getElementById('searchDetails');
    if (!results || !empty) return;
    results.innerHTML = '';
    if (details) {
        details.classList.add('hidden');
    }
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
        const metaValue = item.type === 'Film'
            ? (item.duration ? `${item.duration} min` : 'Durée inconnue')
            : (item.nbepisodes ? `${item.nbepisodes} épisodes` : 'Épisodes inconnus');

        row.innerHTML = `
            <div class="search-result-art">
                <img src="${item.coverImage || 'https://via.placeholder.com/120x168?text=No+Image'}" alt="${item.title}" loading="lazy">
            </div>
            <div class="search-result-content">
                <span class="search-result-title">${item.title || 'Titre inconnu'}</span>
                <span class="search-result-subtitle">${item.type || 'Série'} • ${metaValue}</span>
                <span class="search-result-year">${item.year ? `${item.year}` : 'Année inconnue'}</span>
            </div>
        `;
        if (item.description) {
            const description = document.createElement('span');
            description.className = 'search-result-description';
            description.textContent = item.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            row.querySelector('.search-result-content').appendChild(description);
        }
        row.addEventListener('click', () => showCardInfo({
            id: item.id,
            img: item.coverImage || '',
            title: item.title,
            saisons: 1,
            episodes: item.nbepisodes,
            status: 'toview',
            saisonencours: 0,
            epencours: 0,
            film: item.type === 'Film' ? 1 : 0,
            duree: item.duration || '',
            favori: 0,
            flag: 0
        }, { isSearchResult: true, searchData: item }));
        results.appendChild(row);
    });
}

function selectSearchResult(item) {
    selectedSearchAnime = item;
    const details = document.getElementById('searchDetails');
    const image = document.getElementById('searchDetailsImage');
    const title = document.getElementById('searchDetailsTitle');
    const subtitle = document.getElementById('searchDetailsSubtitle');
    const episodes = document.getElementById('searchDetailsEpisodes');
    const year = document.getElementById('searchDetailsYear');
    const addButton = document.getElementById('searchAddButton');

    if (!details || !image || !title || !subtitle || !episodes || !year || !addButton) return;

    image.src = item.coverImage || 'https://via.placeholder.com/240x360?text=No+Image';
    title.textContent = item.title || 'Titre inconnu';
    subtitle.textContent = item.subtitle || '';
    episodes.textContent = item.nbepisodes ? `${item.nbepisodes} épisodes` : 'Épisodes inconnus';
    year.textContent = item.year ? `Année ${item.year}` : '';
    details.classList.remove('hidden');

    addButton.disabled = false;
    addButton.textContent = 'Ajouter à la liste';
    addButton.onclick = async () => {
        addButton.disabled = true;
        addButton.textContent = 'Ajout...';
        const nbepisodes = Number(item.nbepisodes) || 0;
        const isMovie = item.type === 'Film';
        const dureeVal = isMovie ? (Number(item.duration || 0) || '00:00:00') : '00:00:00';
        const added = await addAnime(
            item.id,
            item.coverImage || '',
            item.nativeTitle || '',
            item.romajiTitle || item.title || '',
            item.englishTitle || item.title || '',
            'EN',
            'toview',
            1,
            nbepisodes,
            0,
            0,
            '',
            isMovie,
            dureeVal,
            0,
            0,
            item.description || ''
        );
        addButton.textContent = added ? 'Ajouté' : 'Réessayer';
        addButton.disabled = false;
    };
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
                format
                seasonYear
                episodes
                duration
                description
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
        const items = media.map(anime => {
            const isMovie = anime.format === 'MOVIE';
            const type = isMovie ? 'Film' : 'Série';
            return {
                id: anime.id,
                title: anime.title.english || anime.title.romaji || anime.title.native || 'Sans titre',
                nativeTitle: anime.title.native || '',
                romajiTitle: anime.title.romaji || anime.title.english || anime.title.native || '',
                englishTitle: anime.title.english || anime.title.romaji || anime.title.native || '',
                subtitle: isMovie
                    ? (anime.duration ? `${anime.duration} min` : 'Durée inconnue')
                    : `${anime.episodes || '?'} Ep`,
                type,
                coverImage: anime.coverImage?.large || anime.coverImage?.medium || '',
                nbepisodes: anime.episodes || 0,
                duration: anime.duration || 0,
                year: anime.seasonYear || '',
                description: anime.description || ''
            };
        });
        renderSearchResults(items);
    } catch (err) {
        console.error('Erreur recherche AniList :', err);
        showAppToast('La recherche est momentanément indisponible.', 'error');
        clearSearchResults('Erreur lors de la recherche. Réessayez.');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchQuery');
    if (searchInput) {
        let searchTimeout = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchAnime(searchInput.value.trim());
            }, 300);
        });
    }

    const imageInput = document.getElementById('manual-image-url');
    const fileInput = document.getElementById('manual-image-file');
    const preview = document.getElementById('manual-image-preview');
    const previewWrap = document.getElementById('manual-image-preview-wrap');
    const showPreview = source => {
        preview.onload = () => previewWrap.classList.add('has-image');
        preview.onerror = () => {
            preview.removeAttribute('src');
            previewWrap.classList.remove('has-image');
        };
        preview.src = source;
    };

    if (imageInput && fileInput && preview && previewWrap) {
        imageInput.addEventListener('input', () => {
            const url = imageInput.value.trim();
            if (url) fileInput.value = '';
            if (!url) {
                preview.removeAttribute('src');
                previewWrap.classList.remove('has-image');
                return;
            }
            showPreview(url);
        });

        fileInput.addEventListener('change', () => {
            const file = fileInput.files?.[0];
            if (!file) return;
            imageInput.value = '';
            showPreview(URL.createObjectURL(file));
        });
    }

    toggleManualTypeFields();
});


