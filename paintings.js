// Painting viewpoints mapped to game places (generated from painting_locations_clean_v2.csv).
// match: exact = within 10 km of the town centre, near = within 30 km.
// image: Wikimedia Commons or paintinglocations.com image URL, only where the image was checked as a MATCH; null otherwise.
// PAINTINGS are shown in the game. PAINTINGS_PENDING are for planned new towns and are not shown until those places are added.
var PAINTINGS = {
  "par": [
    {
      "title": "Place de la Concorde",
      "artist": "Edgar Degas",
      "url": "https://paintinglocations.com/paintings/place-de-la-concorde/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Edgar_Degas_Place_de_la_Concorde.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 0.4
    },
    {
      "title": "View of Paris from Vincent's Room in the Rue Lepic",
      "artist": "Vincent van Gogh",
      "url": "https://paintinglocations.com/paintings/view-of-paris-from-vincent-s-room-in-the-rue-lepic/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Vincent_van_Gogh_-_View_from_Theo%E2%80%99s_apartment_-_Google_Art_Project.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 0.4
    },
    {
      "title": "Vue de toits",
      "artist": "Gustave Caillebotte",
      "url": "https://paintinglocations.com/paintings/vue-de-toits/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Gustave_Caillebotte_-_Rooftops_in_the_Snow_%28snow_effect%29_-_Google_Art_Project.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 0.4
    },
    {
      "title": "Le Pont Neuf",
      "artist": "Pierre-Auguste Renoir",
      "url": "https://paintinglocations.com/paintings/le-pont-neuf/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Pont-Neuf_%281872%29_-_Pierre-Auguste_Renoir_%28National_Gallery_of_Art%2C_Washington_D.C.%29.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 0.7
    },
    {
      "title": "Notre-Dame, one late afternoon",
      "artist": "Henri Matisse",
      "url": "https://paintinglocations.com/paintings/notre-dame-one-late-afternoon/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Notre-Dame%2C_une_fin_d%27apr%C3%A8s-midi%2C_par_Henri_Matisse.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 0.8
    },
    {
      "title": "Rue Saint-Honoré in the Afternoon. Effect of Rain",
      "artist": "Camille Pissarro",
      "url": "https://paintinglocations.com/paintings/rue-saint-honore-in-the-afternoon-effect-of-rain/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Camille_Pissarro_-_Rue_Saint-Honor%C3%A9%2C_dans_l%27apr%C3%A8s-midi._Effet_de_pluie.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.1
    },
    {
      "title": "The Bohemian",
      "artist": "William-Adolphe Bouguereau",
      "url": "https://paintinglocations.com/paintings/the-bohemian/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/William-Adolphe_Bouguereau_%281825-1905%29_-_The_Bohemian_%281890%29.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.1
    },
    {
      "title": "Studio in the Rue de Furstemberg",
      "artist": "Frédéric Bazille",
      "url": "https://paintinglocations.com/paintings/studio-in-the-rue-de-furstemberg/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Bazille_Studio_in_the_rue_de_Furstenberg.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.2
    },
    {
      "title": "Boulevard Montmartre, Mardi Gras",
      "artist": "Camille Pissarro",
      "url": "https://paintinglocations.com/paintings/boulevard-montmartre-mardi-gras/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Camille_Pissarro_-_Boulevard_Montmartre%2C_Mardi_Gras_%281897%29.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.4
    },
    {
      "title": "La Place des Pyramides, Paris (I)",
      "artist": "Giuseppe De Nittis",
      "url": "https://paintinglocations.com/paintings/la-place-des-pyramides-paris-i/",
      "image": "https://paintinglocations.com/img/art/la-place-des-pyramides-paris-i/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "exact",
      "km": 1.4
    },
    {
      "title": "A Bar at the Folies-Bergère",
      "artist": "Édouard Manet",
      "url": "https://paintinglocations.com/paintings/a-bar-at-the-folies-bergere/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Un_bar_aux_Folies-Berg%C3%A8re_d%27E._Manet_%28Fondation_Vuitton%2C_Paris%29_%2833539037428%29.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.6
    },
    {
      "title": "Chez Tortoni",
      "artist": "Édouard Manet",
      "url": "https://paintinglocations.com/paintings/chez-tortoni/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/%C3%89douard_Manet_Chez_Tortoni.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.6
    },
    {
      "title": "The Luxembourg Gardens, Paris",
      "artist": "Albert Edelfelt",
      "url": "https://paintinglocations.com/paintings/the-luxembourg-gardens-paris/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Albert_Edelfelt_-_The_Luxembourg_Gardens%2C_Paris.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.7
    },
    {
      "title": "Music in the Tuileries",
      "artist": "Édouard Manet",
      "url": "https://paintinglocations.com/paintings/music-in-the-tuileries/",
      "image": "https://paintinglocations.com/img/art/music-in-the-tuileries/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "exact",
      "km": 1.8
    },
    {
      "title": "Vue du canal Saint-Martin",
      "artist": "Alfred Sisley",
      "url": "https://paintinglocations.com/paintings/vue-du-canal-saint-martin/",
      "image": "https://paintinglocations.com/img/art/vue-du-canal-saint-martin/800.jpg",
      "image_source": "paintinglocations.com",
      "match": "exact",
      "km": 2.3
    },
    {
      "title": "Le Café-concert aux ambassadeurs",
      "artist": "Edgar Degas",
      "url": "https://paintinglocations.com/paintings/le-cafe-concert-aux-ambassadeurs/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Edgar_Germain_Hilaire_Degas_038.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 2.4
    },
    {
      "title": "The Circus",
      "artist": "Georges Seurat",
      "url": "https://paintinglocations.com/paintings/the-circus/",
      "image": "https://paintinglocations.com/img/art/the-circus/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "exact",
      "km": 2.5
    },
    {
      "title": "L'Absinthe",
      "artist": "Edgar Degas",
      "url": "https://paintinglocations.com/paintings/l-absinthe/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Edgar_Degas_-_In_a_Caf%C3%A9_-_Google_Art_Project_2.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 2.6
    },
    {
      "title": "The Horse Fair",
      "artist": "Rosa Bonheur",
      "url": "https://paintinglocations.com/paintings/the-horse-fair/",
      "image": "https://paintinglocations.com/img/art/the-horse-fair/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "exact",
      "km": 2.6
    },
    {
      "title": "Arrival of the Normandy Train, Gare Saint-Lazare",
      "artist": "Claude Monet",
      "url": "https://paintinglocations.com/paintings/arrival-of-the-normandy-train-gare-saint-lazare/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Claude%20Monet%20-%20Arrival%20of%20the%20Normandy%20Train%2C%20Gare%20Saint-Lazare%20-%20Google%20Art%20Project.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 2.7
    },
    {
      "title": "The Railway",
      "artist": "Édouard Manet",
      "url": "https://paintinglocations.com/paintings/the-railway/",
      "image": "https://paintinglocations.com/img/art/the-railway/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "exact",
      "km": 2.7
    },
    {
      "title": "Agostina Segatori Sitting in the Café du Tambourin",
      "artist": "Vincent van Gogh",
      "url": "https://paintinglocations.com/paintings/agostina-segatori-sitting-in-the-cafe-du-tambourin/",
      "image": "https://paintinglocations.com/img/art/agostina-segatori-sitting-in-the-cafe-du-tambourin/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "exact",
      "km": 2.8
    },
    {
      "title": "Le Pont de l'Europe",
      "artist": "Gustave Caillebotte",
      "url": "https://paintinglocations.com/paintings/le-pont-de-l-europe/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Caillebotte-PontdeL%27Europe-Geneva.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 2.9
    },
    {
      "title": "Paris Street; Rainy Day",
      "artist": "Gustave Caillebotte",
      "url": "https://paintinglocations.com/paintings/paris-street-rainy-day/",
      "image": "https://paintinglocations.com/img/art/paris-street-rainy-day/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "exact",
      "km": 2.9
    },
    {
      "title": "The Rue Mosnier Dressed with Flags",
      "artist": "Édouard Manet",
      "url": "https://paintinglocations.com/paintings/the-rue-mosnier-dressed-with-flags/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/%C3%89douard_Manet%2C_The_Rue_Mosnier_with_Flags%2C_1878.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 3.0
    },
    {
      "title": "Bal du moulin de la Galette",
      "artist": "Pierre-Auguste Renoir",
      "url": "https://paintinglocations.com/paintings/bal-du-moulin-de-la-galette/",
      "image": "https://paintinglocations.com/img/art/bal-du-moulin-de-la-galette/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "exact",
      "km": 3.2
    },
    {
      "title": "Paris, vu des hauteurs du Père Lachaise",
      "artist": "Louise-Joséphine Sarazin de Belmont",
      "url": "https://paintinglocations.com/paintings/paris-vu-des-hauteurs-du-pere-lachaise/",
      "image": "https://paintinglocations.com/img/art/paris-vu-des-hauteurs-du-pere-lachaise/800.jpg",
      "image_source": "paintinglocations.com",
      "match": "exact",
      "km": 3.3
    },
    {
      "title": "Effect of Snow on Petit-Montrouge",
      "artist": "Édouard Manet",
      "url": "https://paintinglocations.com/paintings/effect-of-snow-on-petit-montrouge/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/%C3%89douard_Manet_-_Effet_de_neige_%C3%A0_Petit%E2%80%93Montrouge.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 3.9
    },
    {
      "title": "Champs de Mars, the Red Tower",
      "artist": "Robert Delaunay",
      "url": "https://paintinglocations.com/paintings/champs-de-mars-the-red-tower/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Delaunay_ChampDeMars.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 4.1
    },
    {
      "title": "View of Montmartre from the Cité des Fleurs",
      "artist": "Alfred Sisley",
      "url": "https://paintinglocations.com/paintings/view-of-montmartre-from-the-cite-des-fleurs/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Vue_de_Montmartre%2C_depuis_la_Cit%C3%A9_des_Fleurs_aux_Batignolles.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 4.2
    },
    {
      "title": "A Sunday Afternoon on the Island of La Grande Jatte",
      "artist": "Georges Seurat",
      "url": "https://paintinglocations.com/paintings/a-sunday-afternoon-on-the-island-of-la-grande-jatte/",
      "image": "https://paintinglocations.com/img/art/a-sunday-afternoon-on-the-island-of-la-grande-jatte/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "exact",
      "km": 7.2
    },
    {
      "title": "Summer's Day",
      "artist": "Berthe Morisot",
      "url": "https://paintinglocations.com/paintings/summer-s-day/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Berthe_Morisot_-_Jour_d%27%C3%A9t%C3%A9%2C_1879.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 7.3
    },
    {
      "title": "Bathers at Asnières",
      "artist": "Georges Seurat",
      "url": "https://paintinglocations.com/paintings/bathers-at-asnieres/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Baigneurs_a_Asnieres.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 7.4
    },
    {
      "title": "The Bridge at Villeneuve-la-Garenne",
      "artist": "Alfred Sisley",
      "url": "https://paintinglocations.com/paintings/the-bridge-at-villeneuve-la-garenne/",
      "image": "https://images.metmuseum.org/CRDImages/ep/web-large/DP-14936-041.jpg",
      "image_source": "images.metmuseum.org",
      "match": "exact",
      "km": 8.5
    },
    {
      "title": "The Races at Longchamp",
      "artist": "Édouard Manet",
      "url": "https://paintinglocations.com/paintings/the-races-at-longchamp/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/%C3%89douard%20Manet%20-%20The%20Races%20at%20Longchamp%20-%201922.424%20-%20Art%20Institute%20of%20Chicago.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 8.8
    },
    {
      "title": "The road from Sèvres to Paris",
      "artist": "Jean-Baptiste Camille Corot",
      "url": "https://paintinglocations.com/paintings/the-road-from-sevres-to-paris/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Jean-Baptiste-Camille_Corot_051.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 11.0
    },
    {
      "title": "Claude Monet painting in his studio boat",
      "artist": "Édouard Manet",
      "url": "https://paintinglocations.com/paintings/claude-monet-painting-in-his-studio-boat/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Manet-Die_Barke.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 11.3
    },
    {
      "title": "Women in the Garden",
      "artist": "Claude Monet",
      "url": "https://paintinglocations.com/paintings/women-in-the-garden/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Claude_Monet_024.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 12.1
    },
    {
      "title": "Argenteuil",
      "artist": "Édouard Manet",
      "url": "https://paintinglocations.com/paintings/argenteuil/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/%C3%89douard_Manet_-_Argenteuil.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 12.2
    },
    {
      "title": "Régates à Argenteuil",
      "artist": "Claude Monet",
      "url": "https://paintinglocations.com/paintings/regates-a-argenteuil/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Claude_Monet_-_Regattas_at_Argenteuil_-_Google_Art_Project.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 12.2
    },
    {
      "title": "Snow at Argenteuil",
      "artist": "Claude Monet",
      "url": "https://paintinglocations.com/paintings/snow-at-argenteuil/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Monet_Snow_at_Argenteuil_1875.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 12.2
    },
    {
      "title": "The Poppy Field near Argenteuil",
      "artist": "Claude Monet",
      "url": "https://paintinglocations.com/paintings/the-poppy-field-near-argenteuil/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Claude_Monet_-_Poppy_Field_-_Google_Art_Project.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 12.2
    },
    {
      "title": "The Seine in Argenteuil",
      "artist": "Claude Monet",
      "url": "https://paintinglocations.com/paintings/the-seine-in-argenteuil/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Claude_Monet_-_The_Seine_at_Argenteuil_1873.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 12.2
    },
    {
      "title": "Woman with a Parasol – Madame Monet and Her Son",
      "artist": "Claude Monet",
      "url": "https://paintinglocations.com/paintings/woman-with-a-parasol-madame-monet-and-her-son/",
      "image": "https://paintinglocations.com/img/art/woman-with-a-parasol-madame-monet-and-her-son/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "near",
      "km": 12.2
    },
    {
      "title": "Lunch at the Restaurant Fournaise",
      "artist": "Pierre-Auguste Renoir",
      "url": "https://paintinglocations.com/paintings/lunch-at-the-restaurant-fournaise/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Pierre-Auguste%20Renoir%20-%20Lunch%20at%20the%20Restaurant%20Fournaise%20%28The%20Rowers%27%20Lunch%29%20-%201922.437%20-%20Art%20Institute%20of%20Chicago.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 14.0
    },
    {
      "title": "Luncheon of the Boating Party",
      "artist": "Pierre-Auguste Renoir",
      "url": "https://paintinglocations.com/paintings/luncheon-of-the-boating-party/",
      "image": "https://paintinglocations.com/img/art/luncheon-of-the-boating-party/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "near",
      "km": 14.0
    },
    {
      "title": "Dance at Bougival",
      "artist": "Pierre-Auguste Renoir",
      "url": "https://paintinglocations.com/paintings/dance-at-bougival/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Dance-At-Bougival.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 15.4
    },
    {
      "title": "The Seine at Bougival",
      "artist": "Alfred Sisley",
      "url": "https://paintinglocations.com/paintings/the-seine-at-bougival/",
      "image": "https://images.metmuseum.org/CRDImages/ep/web-large/DP323410.jpg",
      "image_source": "images.metmuseum.org",
      "match": "near",
      "km": 15.4
    },
    {
      "title": "Le chemin de la Machine, Louveciennes",
      "artist": "Alfred Sisley",
      "url": "https://paintinglocations.com/paintings/le-chemin-de-la-machine-louveciennes/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Alfred_Sisley_071.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 16.6
    },
    {
      "title": "Doctor Gachet's Garden in Auvers",
      "artist": "Vincent van Gogh",
      "url": "https://paintinglocations.com/paintings/doctor-gachet-s-garden-in-auvers/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Doctor_Gachet%27s_Garden_in_Auvers.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 26.8
    },
    {
      "title": "Plain near Auvers",
      "artist": "Vincent van Gogh",
      "url": "https://paintinglocations.com/paintings/plain-near-auvers/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Plain_at_Auvers_with_rain_clouds_-_Vincent_Van_Gogh_%28unframed%29.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 26.8
    },
    {
      "title": "Rain, Auvers",
      "artist": "Vincent van Gogh",
      "url": "https://paintinglocations.com/paintings/rain-auvers/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Amgueddfa_Cymru_-_Glaw%2C_Auvers_-_Rain%2C_Auvers_-_2470.jpeg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 26.8
    },
    {
      "title": "The Church at Auvers",
      "artist": "Vincent van Gogh",
      "url": "https://paintinglocations.com/paintings/the-church-at-auvers/",
      "image": "https://paintinglocations.com/img/art/the-church-at-auvers/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "near",
      "km": 26.8
    },
    {
      "title": "The Hanged Man's House",
      "artist": "Paul Cézanne",
      "url": "https://paintinglocations.com/paintings/the-hanged-man-s-house/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/La_Maison_du_pendu%2C_Auvers-sur-Oise%2C_par_Paul_C%C3%A9zanne%2C_FWN_81.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 26.8
    },
    {
      "title": "The Town Hall at Auvers",
      "artist": "Vincent van Gogh",
      "url": "https://paintinglocations.com/paintings/the-town-hall-at-auvers/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Van_Gogh_-_Das_Rathaus_in_Auvers_am_14._Juli_1890.jpeg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 26.8
    },
    {
      "title": "Wheatfield with Crows",
      "artist": "Vincent van Gogh",
      "url": "https://paintinglocations.com/paintings/wheatfield-with-crows/",
      "image": "https://paintinglocations.com/img/art/wheatfield-with-crows/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "near",
      "km": 26.8
    }
  ],
  "msy": [
    {
      "title": "A Cotton Office in New Orleans",
      "artist": "Edgar Degas",
      "url": "https://paintinglocations.com/paintings/a-cotton-office-in-new-orleans/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Edgar_Germain_Hilaire_Degas_016.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 2.9
    }
  ],
  "rot": [
    {
      "title": "View of Delft",
      "artist": "Johannes Vermeer",
      "url": "https://paintinglocations.com/paintings/view-of-delft/",
      "image": "https://paintinglocations.com/img/art/view-of-delft/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "near",
      "km": 12.4
    },
    {
      "title": "A Mayor of Delft and his Daughter",
      "artist": "Jan Steen",
      "url": "https://paintinglocations.com/paintings/a-mayor-of-delft-and-his-daughter/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Adolf_en_Catharina_Croeser%2C_bekend_als_%E2%80%98De_burgemeester_van_Delft_en_zijn_dochter%E2%80%99_Rijksmuseum_SK-A-4981.jpeg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 12.6
    },
    {
      "title": "A View of Delft",
      "artist": "Carel Fabritius",
      "url": "https://paintinglocations.com/paintings/a-view-of-delft/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/FabritiusViewOfDelft.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 13.1
    },
    {
      "title": "The Courtyard of a House in Delft",
      "artist": "Pieter de Hooch",
      "url": "https://paintinglocations.com/paintings/the-courtyard-of-a-house-in-delft/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Pieter_de_Hooch_-_The_Courtyard_of_a_House_in_Delft.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 13.1
    },
    {
      "title": "The Little Street",
      "artist": "Johannes Vermeer",
      "url": "https://paintinglocations.com/paintings/the-little-street/",
      "image": "https://paintinglocations.com/img/art/the-little-street/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "near",
      "km": 13.2
    }
  ],
  "bru": [
    {
      "title": "The Blind Leading the Blind",
      "artist": "Pieter Brueghel the Elder",
      "url": "https://paintinglocations.com/paintings/the-blind-leading-the-blind/",
      "image": "https://paintinglocations.com/img/art/the-blind-leading-the-blind/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "exact",
      "km": 8.4
    },
    {
      "title": "A View of Het Steen in the Early Morning",
      "artist": "Peter Paul Rubens",
      "url": "https://paintinglocations.com/paintings/a-view-of-het-steen-in-the-early-morning/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Peter_Paul_Rubens_-_View_of_Het_Steen_Castle_in_the_Early_Morning.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 15.1
    }
  ],
  "lon": [
    {
      "title": "Nocturne in Black and Gold – The Falling Rocket",
      "artist": "James McNeill Whistler",
      "url": "https://paintinglocations.com/paintings/nocturne-in-black-and-gold-the-falling-rocket/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Whistler-Nocturne_in_black_and_gold.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 0.1
    },
    {
      "title": "London Bridge on the Night of the Marriage of the Prince and Princess of Wales",
      "artist": "William Holman Hunt",
      "url": "https://paintinglocations.com/paintings/london-bridge-on-the-night-of-the-marriage-of-the-prince-and-princess-of-wales/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/William_Holman_Hunt_-_London_Bridge_on_the_Night_of_the_Marriage_of_the_Prince_and_Princess_of_Wales_-_1864.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 2.7
    },
    {
      "title": "Nocturne: Blue and Silver – Chelsea",
      "artist": "James McNeill Whistler",
      "url": "https://paintinglocations.com/paintings/nocturne-blue-and-silver-chelsea/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/James_Abbott_McNeill_Whistler_-_Nocturne-_Blue_and_Silver_-_Chelsea_-_Google_Art_Project.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 3.6
    },
    {
      "title": "Nocturne: Blue and Gold – Old Battersea Bridge",
      "artist": "James McNeill Whistler",
      "url": "https://paintinglocations.com/paintings/nocturne-blue-and-gold-old-battersea-bridge/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/James_Abbot_McNeill_Whistler_006.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 4.3
    },
    {
      "title": "Under the Bridge of Hampton Court",
      "artist": "Alfred Sisley",
      "url": "https://paintinglocations.com/paintings/under-the-bridge-of-hampton-court/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Alfred_Sisley_066.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 18.8
    },
    {
      "title": "A View of Walton Bridge",
      "artist": "Canaletto",
      "url": "https://paintinglocations.com/paintings/a-view-of-walton-bridge/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Canaletto_%28Giovanni_Antonio_Canal%29_-_A_View_of_Walton_Bridge_-_Google_Art_Project.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 24.9
    }
  ],
  "rom": [
    {
      "title": "Carlo III di Borbone visiting the Pope Benedetto XIV in the coffee-house of the Quirinale, Rome",
      "artist": "Giovanni Paolo Panini",
      "url": "https://paintinglocations.com/paintings/carlo-iii-di-borbone-visiting-the-pope-benedetto-xiv-in-the-coffee-house-of-the-/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Carlo_di_Borbone_visita_il_papa_Benedetto_XIV_nella_coffee-house_del_Quirinale%2C_Pannini_001.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.1
    },
    {
      "title": "A View through Three of the North-Western Arches of the Third Storey of the Coliseum",
      "artist": "Christoffer Wilhelm Eckersberg",
      "url": "https://paintinglocations.com/paintings/a-view-through-three-of-the-north-western-arches-of-the-third-storey-of-the-coli/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/C.W._Eckersberg_-_A_View_through_Three_Arches_of_the_Third_Storey_of_the_Colosseum_-_Google_Art_Project.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.3
    },
    {
      "title": "View of the Garden of the Villa Medici",
      "artist": "Diego Velázquez",
      "url": "https://paintinglocations.com/paintings/view-of-the-garden-of-the-villa-medici/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Vista_del_jard%C3%ADn_de_la_Villa_Medici_en_Roma%2C_por_Diego_Vel%C3%A1zquez.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.7
    },
    {
      "title": "Goethe in the Roman Campagna",
      "artist": "Johann Heinrich Wilhelm Tischbein",
      "url": "https://paintinglocations.com/paintings/goethe-in-the-roman-campagna/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Goethe_in_the_Roman_Campagna_%28SM_1157%29.png?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 5.6
    }
  ],
  "cph": [
    {
      "title": "Dust Motes Dancing in Sunbeams",
      "artist": "Vilhelm Hammershøi",
      "url": "https://paintinglocations.com/paintings/dust-motes-dancing-in-sunbeams/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Hammershoi_sunlight.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.4
    },
    {
      "title": "Amalienborg Square, Copenhagen",
      "artist": "Vilhelm Hammershøi",
      "url": "https://paintinglocations.com/paintings/amalienborg-square-copenhagen/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Hammersh%C3%B8i%2C_Vilhelm_-_Amalienborg_Plads_-_KMS1542.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.8
    },
    {
      "title": "View from the Artist's Window",
      "artist": "Martinus Rørbye",
      "url": "https://paintinglocations.com/paintings/view-from-the-artist-s-window/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Udsigt_fra_kunstnerens_vindue.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 2.3
    },
    {
      "title": "The Men of Industry",
      "artist": "Peder Severin Krøyer",
      "url": "https://paintinglocations.com/paintings/the-men-of-industry/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/P.S._Kr%C3%B8yer%2C_Industriens_M%C3%A6nd%2C_1903-1904%2C_Det_Nationalhistoriske_Museum_p%C3%A5_Frederiksborg.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 2.7
    }
  ],
  "ven": [
    {
      "title": "Venice, from the Porch of Madonna della Salute",
      "artist": "J. M. W. Turner",
      "url": "https://paintinglocations.com/paintings/venice-from-the-porch-of-madonna-della-salute/",
      "image": "https://images.metmuseum.org/CRDImages/ep/web-large/DP169568.jpg",
      "image_source": "images.metmuseum.org",
      "match": "exact",
      "km": 0.6
    },
    {
      "title": "View of the Bacino di San Marco from the Punta della Dogana",
      "artist": "Canaletto",
      "url": "https://paintinglocations.com/paintings/view-of-the-bacino-di-san-marco-from-the-punta-della-dogana/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Giovanni_Antonio_Canal%2C_il_Canaletto_-_View_of_the_Bacino_di_San_Marco_%28St_Mark%27s_Basin%29_-_WGA03899.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 0.9
    },
    {
      "title": "The Stonemason's Yard",
      "artist": "Canaletto",
      "url": "https://paintinglocations.com/paintings/the-stonemason-s-yard/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Canaletto_-_The_Stonemason%27s_Yard.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.1
    },
    {
      "title": "Miracle of the Holy Cross at the Rialto Bridge",
      "artist": "Vittore Carpaccio",
      "url": "https://paintinglocations.com/paintings/miracle-of-the-holy-cross-at-the-rialto-bridge/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Accademia_-_Miracle_of_the_Holy_Cross_at_Rialto_by_Vittore_Carpaccio.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.2
    },
    {
      "title": "Procession in St. Mark's Square",
      "artist": "Gentile Bellini",
      "url": "https://paintinglocations.com/paintings/procession-in-st-mark-s-square/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Accademia_-_Procession_in_piazza_San_Marco_by_Gentile_Bellini.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.5
    },
    {
      "title": "Juliet and her Nurse",
      "artist": "J. M. W. Turner",
      "url": "https://paintinglocations.com/paintings/juliet-and-her-nurse/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/J._M._W._Turner_-_Juliet_and_her_Nurse_%281836%29_Google_Art_Project.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.6
    },
    {
      "title": "St Mark's Body Brought to Venice",
      "artist": "Jacopo Tintoretto",
      "url": "https://paintinglocations.com/paintings/st-mark-s-body-brought-to-venice/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Jacopo_Tintoretto_-_St_Mark%27s_Body_Brought_to_Venice.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.6
    },
    {
      "title": "The Entrance to the Grand Canal, Venice",
      "artist": "Canaletto",
      "url": "https://paintinglocations.com/paintings/the-entrance-to-the-grand-canal-venice/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Canaletto_-_The_Entrance_to_the_Grand_Canal%2C_Venice_-_Google_Art_Project.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.6
    },
    {
      "title": "The Grand Canal",
      "artist": "Claude Monet",
      "url": "https://paintinglocations.com/paintings/the-grand-canal/",
      "image": "https://paintinglocations.com/img/art/the-grand-canal/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "exact",
      "km": 1.6
    },
    {
      "title": "Arrival of the French Ambassador in Venice",
      "artist": "Canaletto",
      "url": "https://paintinglocations.com/paintings/arrival-of-the-french-ambassador-in-venice/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Canal%2C_Giovanni_Antonio_-_Reception_of_the_French_Ambassador_in_Venice_-_Hermitage.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.7
    },
    {
      "title": "Death of Adonis",
      "artist": "Sebastiano del Piombo",
      "url": "https://paintinglocations.com/paintings/death-of-adonis/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Sebastiano_del_Piombo_-_Morte_di_Adone_-_Google_Art_Project.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.7
    },
    {
      "title": "The Doge's Palace Seen from San Giorgio Maggiore",
      "artist": "Claude Monet",
      "url": "https://paintinglocations.com/paintings/the-doge-s-palace-seen-from-san-giorgio-maggiore/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/The_Doge%27s_Palace_Seen_from_San_Giorgio_Maggiore_MET_DT1904.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.7
    },
    {
      "title": "San Giorgio Maggiore at Dusk",
      "artist": "Claude Monet",
      "url": "https://paintinglocations.com/paintings/san-giorgio-maggiore-at-dusk/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Claude_Monet%2C_Saint-Georges_majeur_au_cr%C3%A9puscule.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 2.3
    }
  ],
  "die": [
    {
      "title": "Beach in Pourville",
      "artist": "Claude Monet",
      "url": "https://paintinglocations.com/paintings/beach-in-pourville/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Monet_Claude%2C_The_Beach_at_Pourville%2C_1882.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 4.2
    }
  ],
  "ber": [
    {
      "title": "Berlin Street Scene",
      "artist": "Ernst Ludwig Kirchner",
      "url": "https://paintinglocations.com/paintings/berlin-street-scene/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Kirchner_Berlin_Street_Scene_1913.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.2
    },
    {
      "title": "Frederick the Great Playing the Flute at Sanssouci",
      "artist": "Adolph von Menzel",
      "url": "https://paintinglocations.com/paintings/frederick-the-great-playing-the-flute-at-sanssouci/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Adolph_Menzel_-_Fl%C3%B6tenkonzert_Friedrichs_des_Gro%C3%9Fen_in_Sanssouci_-_Google_Art_Project.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 27.7
    }
  ],
  "cai": [
    {
      "title": "Bonaparte Before the Sphinx",
      "artist": "Jean-Léon Gérôme",
      "url": "https://paintinglocations.com/paintings/bonaparte-before-the-sphinx/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Bonaparte_ante_la_Esfinge%2C_por_Jean-L%C3%A9on_G%C3%A9r%C3%B4me.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 12.2
    }
  ],
  "vad": [
    {
      "title": "Castel Sant'Angelo and Tiber",
      "artist": "Jean-Baptiste Camille Corot",
      "url": "https://paintinglocations.com/paintings/castel-sant-angelo-and-tiber/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Castel_Sant%27Angelo_by_Corot_Louvre_RF1622_n02.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.1
    },
    {
      "title": "Landscape with Orpheus and Eurydice",
      "artist": "Nicolas Poussin",
      "url": "https://paintinglocations.com/paintings/landscape-with-orpheus-and-eurydice/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Orph%C3%A9e_et_Eurydice_-_Nicolas_Poussin_-_Mus%C3%A9e_du_Louvre_Peintures_INV_7307_-_photo_2.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.1
    }
  ],
  "por": [
    {
      "title": "Chichester Canal",
      "artist": "J. M. W. Turner",
      "url": "https://paintinglocations.com/paintings/chichester-canal/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Chichester_Canal_%281828%29.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 22.2
    }
  ],
  "flo": [
    {
      "title": "View of Florence",
      "artist": "Thomas Cole",
      "url": "https://paintinglocations.com/paintings/view-of-florence/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Cole_Thomas_View_of_Florence_from_San_Miniato_1837.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 0.4
    },
    {
      "title": "Dante and Beatrice",
      "artist": "Henry Holiday",
      "url": "https://paintinglocations.com/paintings/dante-and-beatrice/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Henry_Holiday_-_Dante_and_Beatrice_-_Google_Art_Project.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 0.6
    }
  ],
  "nyc": [
    {
      "title": "Manhattan Bridge Loop",
      "artist": "Edward Hopper",
      "url": "https://paintinglocations.com/paintings/manhattan-bridge-loop/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Manhattan-bridge-loop-edward-hopper-1928.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.4
    },
    {
      "title": "Nighthawks",
      "artist": "Edward Hopper",
      "url": "https://paintinglocations.com/paintings/nighthawks/",
      "image": null,
      "image_source": null,
      "match": "exact",
      "km": 2.3
    },
    {
      "title": "Early Sunday Morning",
      "artist": "Edward Hopper",
      "url": "https://paintinglocations.com/paintings/early-sunday-morning/",
      "image": "https://paintinglocations.com/img/art/early-sunday-morning/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "exact",
      "km": 6.2
    },
    {
      "title": "East Wind Over Weehawken",
      "artist": "Edward Hopper",
      "url": "https://paintinglocations.com/paintings/east-wind-over-weehawken/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/East_Wind_Over_Weehawken%2C_Edward_Hopper_1934.tiff?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 7.3
    }
  ],
  "osl": [
    {
      "title": "Evening on Karl Johan",
      "artist": "Edvard Munch",
      "url": "https://paintinglocations.com/paintings/evening-on-karl-johan/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Edvard_Munch_-_Evening_on_Karl_Johan_Street_%281892%29.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 0.7
    }
  ],
  "har": [
    {
      "title": "Flatford Mill",
      "artist": "John Constable",
      "url": "https://paintinglocations.com/paintings/flatford-mill/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Flatford_Mill_%28Scene_on_a_Navigable_River%29_by_John_Constable%2C_Tate_Britain.JPG?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 18.5
    },
    {
      "title": "The Hay Wain",
      "artist": "John Constable",
      "url": "https://paintinglocations.com/paintings/the-hay-wain/",
      "image": "https://paintinglocations.com/img/art/the-hay-wain/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "near",
      "km": 18.5
    },
    {
      "title": "The Vale of Dedham",
      "artist": "John Constable",
      "url": "https://paintinglocations.com/paintings/the-vale-of-dedham/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/John_Constable_-_The_Vale_of_Dedham_-_Google_Art_Project.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 23.8
    },
    {
      "title": "Wivenhoe Park",
      "artist": "John Constable",
      "url": "https://paintinglocations.com/paintings/wivenhoe-park/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/John_Constable_-_Wivenhoe_Park%2C_Essex_-_Google_Art_Project.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 24.2
    }
  ],
  "bil": [
    {
      "title": "Guernica",
      "artist": "Artist's own account Picasso's reticence Picasso refused to give a fixed reading. Asked about the bull and the horse, he said they were symbols and that viewers must find the meanings themselves; he did say the painting expressed his 'abhorrence of the military caste' that had plunged Spain into suffering.",
      "url": "https://paintinglocations.com/paintings/guernica/",
      "image": null,
      "image_source": null,
      "match": "near",
      "km": 22.2
    }
  ],
  "ams": [
    {
      "title": "The Vegetable Market in Amsterdam",
      "artist": "Gabriel Metsu",
      "url": "https://paintinglocations.com/paintings/the-vegetable-market-in-amsterdam/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Le_March%C3%A9_aux_herbes_d%27Amsterdam_-_Gabriel_Metsu_-_Mus%C3%A9e_du_Louvre_Peintures_INV_1460.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.2
    },
    {
      "title": "View on the Amstel from Amsteldijk",
      "artist": "Jacob van Ruisdael",
      "url": "https://paintinglocations.com/paintings/view-on-the-amstel-from-amsteldijk/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/SA_56435-Gezicht_op_Amsterdam_vanaf_de_Amsteldijk.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.8
    },
    {
      "title": "The Jewish Cemetery",
      "artist": "Jacob van Ruisdael",
      "url": "https://paintinglocations.com/paintings/the-jewish-cemetery/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Jacob_Isaackszoon_van_Ruisdael_-_The_Jewish_Cemetery_%281654_or_1655%29.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 8.3
    },
    {
      "title": "Houses on the Achterzaan",
      "artist": "Claude Monet",
      "url": "https://paintinglocations.com/paintings/houses-on-the-achterzaan/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Houses_on_the_Achterzaan_MET_DT719.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 9.3
    },
    {
      "title": "View of Haarlem with Bleaching Fields",
      "artist": "Jacob van Ruisdael",
      "url": "https://paintinglocations.com/paintings/view-of-haarlem-with-bleaching-fields/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/View_of_Haarlem_with_Bleaching_Grounds_c1665_Ruisdael.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 18.0
    }
  ],
  "mkv": [
    {
      "title": "Moscow courtyard",
      "artist": "Vasily Polenov",
      "url": "https://paintinglocations.com/paintings/moscow-courtyard/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Moscow_Courtyard_%28Polenov%2C_1878%29_-_Google_Art_Project.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 2.0
    }
  ],
  "rou": [
    {
      "title": "Steamboats in the Port of Rouen",
      "artist": "Camille Pissarro",
      "url": "https://paintinglocations.com/paintings/steamboats-in-the-port-of-rouen/",
      "image": "https://images.metmuseum.org/CRDImages/ep/web-large/DT1864.jpg",
      "image_source": "images.metmuseum.org",
      "match": "exact",
      "km": 0.4
    },
    {
      "title": "Pont Boieldieu in Rouen, Rainy Weather",
      "artist": "Camille Pissarro",
      "url": "https://paintinglocations.com/paintings/pont-boieldieu-in-rouen-rainy-weather/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Pissarro_-_Pont_Boieldieu_in_Rouen%2C_Rainy_Weather.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 0.7
    }
  ],
  "krk": [
    {
      "title": "Prussian Homage",
      "artist": "Jan Matejko",
      "url": "https://paintinglocations.com/paintings/prussian-homage/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Prussian_Homage.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 0.7
    }
  ],
  "mil": [
    {
      "title": "Sala delle Asse",
      "artist": "Leonardo da Vinci",
      "url": "https://paintinglocations.com/paintings/sala-delle-asse/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/6.2_1980-1990_Saporetti_angolo_sud.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.4
    },
    {
      "title": "The Street Enters the House",
      "artist": "Umberto Boccioni",
      "url": "https://paintinglocations.com/paintings/the-street-enters-the-house/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Umberto_Boccioni%2C_1911%2C_The_Street_Enters_the_House%2C_oil_on_canvas%2C_100_x_100.6_cm%2C_Sprengel_Museum.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.8
    }
  ],
  "sal": [
    {
      "title": "Salisbury Cathedral from the Bishop's Grounds",
      "artist": "John Constable",
      "url": "https://paintinglocations.com/paintings/salisbury-cathedral-from-the-bishop-s-grounds/",
      "image": "https://paintinglocations.com/img/art/salisbury-cathedral-from-the-bishop-s-grounds/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "exact",
      "km": 0.6
    },
    {
      "title": "Salisbury Cathedral from the Meadows",
      "artist": "John Constable",
      "url": "https://paintinglocations.com/paintings/salisbury-cathedral-from-the-meadows/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Constable_Salisbury_meadows.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 0.6
    }
  ],
  "hoh": [
    {
      "title": "The Bull",
      "artist": "Paulus Potter",
      "url": "https://paintinglocations.com/paintings/the-bull/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Paulus_Potter_-_The_Bull_-_136_-_Mauritshuis.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 16.3
    },
    {
      "title": "View of the Sea at Scheveningen",
      "artist": "Vincent van Gogh",
      "url": "https://paintinglocations.com/paintings/view-of-the-sea-at-scheveningen/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Vincent_van_Gogh_-_Zeegezicht_bij_Scheveningen_%281882%29.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 17.3
    },
    {
      "title": "The Avenue at Middelharnis",
      "artist": "Meindert Hobbema",
      "url": "https://paintinglocations.com/paintings/the-avenue-at-middelharnis/",
      "image": "https://paintinglocations.com/img/art/the-avenue-at-middelharnis/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "near",
      "km": 25.2
    }
  ],
  "ath": [
    {
      "title": "The Parthenon",
      "artist": "Frederic Edwin Church",
      "url": "https://paintinglocations.com/paintings/the-parthenon/",
      "image": "https://images.metmuseum.org/CRDImages/ad/web-large/DT1540.jpg",
      "image_source": "images.metmuseum.org",
      "match": "exact",
      "km": 1.4
    }
  ],
  "edi": [
    {
      "title": "The Ruins of Holyrood Chapel",
      "artist": "Louis Daguerre",
      "url": "https://paintinglocations.com/paintings/the-ruins-of-holyrood-chapel/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/The_Ruins_of_Holyrood_Chapel_%28Louis_Daguerre%29%2C_1824_%28Google_Art_Project%29.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 1.2
    }
  ],
  "mnc": [
    {
      "title": "The Valley of the Nervia",
      "artist": "Claude Monet",
      "url": "https://paintinglocations.com/paintings/the-valley-of-the-nervia/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Claude_Monet_-_The_Valley_of_the_Nervia.jpg?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "near",
      "km": 18.5
    }
  ],
  "hel": [
    {
      "title": "The Wounded Angel",
      "artist": "Hugo Simberg",
      "url": "https://paintinglocations.com/paintings/the-wounded-angel/",
      "image": "https://paintinglocations.com/img/art/the-wounded-angel/1200.jpg",
      "image_source": "paintinglocations.com",
      "match": "exact",
      "km": 2.4
    }
  ],
  "sth": [
    {
      "title": "Vädersolstavlan",
      "artist": "Jacob Heinrich Elbfas",
      "url": "https://paintinglocations.com/paintings/vadersolstavlan/",
      "image": "https://commons.wikimedia.org/wiki/Special:FilePath/V%C3%A4dersoltavlan_cropped.JPG?width=1600",
      "image_source": "commons.wikimedia.org",
      "match": "exact",
      "km": 0.4
    }
  ]
};

var PAINTINGS_PENDING = {
  "ant": {
    "name": "Antwerp",
    "lat": 51.2194,
    "lon": 4.4025,
    "priority": 2,
    "paintings": [
      {
        "title": "Two Chained Monkeys",
        "artist": "Pieter Brueghel the Elder",
        "url": "https://paintinglocations.com/paintings/two-chained-monkeys/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Pieter_Bruegel_%28der_%C3%84ltere%29_%28ca._1525_-_1569%29_-_Zwei_angekettete_Affen_-_2077_-_Gem%C3%A4ldegalerie.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 0.2
      }
    ]
  },
  "arl": {
    "name": "Arles",
    "lat": 43.6766,
    "lon": 4.6278,
    "priority": 1,
    "paintings": [
      {
        "title": "A Lane near Arles",
        "artist": "Vincent van Gogh",
        "url": "https://paintinglocations.com/paintings/a-lane-near-arles/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Van_Gogh_-_Allee_bei_Arles_mit_H%C3%A4usern.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 0.1
      },
      {
        "title": "Café Terrace at Night",
        "artist": "Vincent van Gogh",
        "url": "https://paintinglocations.com/paintings/cafe-terrace-at-night/",
        "image": "https://paintinglocations.com/img/art/cafe-terrace-at-night/1200.jpg",
        "image_source": "paintinglocations.com",
        "match": "exact",
        "km": 0.1
      },
      {
        "title": "The Night Café",
        "artist": "Vincent van Gogh",
        "url": "https://paintinglocations.com/paintings/the-night-cafe/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Vincent_Willem_van_Gogh_076.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 0.1
      },
      {
        "title": "The Yellow House",
        "artist": "Vincent van Gogh",
        "url": "https://paintinglocations.com/paintings/the-yellow-house/",
        "image": "https://paintinglocations.com/img/art/the-yellow-house/1200.jpg",
        "image_source": "paintinglocations.com",
        "match": "exact",
        "km": 0.1
      },
      {
        "title": "View of Arles, Flowering Orchards",
        "artist": "Vincent van Gogh",
        "url": "https://paintinglocations.com/paintings/view-of-arles-flowering-orchards/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Muenchen_Neue_Pinakothek_van_Gogh_Arles.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 0.1
      },
      {
        "title": "Starry Night Over the Rhone",
        "artist": "Vincent van Gogh",
        "url": "https://paintinglocations.com/paintings/starry-night-over-the-rhone/",
        "image": "https://paintinglocations.com/img/art/starry-night-over-the-rhone/1200.jpg",
        "image_source": "paintinglocations.com",
        "match": "exact",
        "km": 0.8
      },
      {
        "title": "Les Alyscamps",
        "artist": "Vincent van Gogh",
        "url": "https://paintinglocations.com/paintings/les-alyscamps/",
        "image": "https://paintinglocations.com/img/art/les-alyscamps/1200.jpg",
        "image_source": "paintinglocations.com",
        "match": "exact",
        "km": 0.9
      },
      {
        "title": "Landscape with Snow",
        "artist": "Vincent van Gogh",
        "url": "https://paintinglocations.com/paintings/landscape-with-snow/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Van_Gogh_-_Landschaft_im_Schnee.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 4.3
      },
      {
        "title": "Enclosed Field with Peasant",
        "artist": "Vincent van Gogh",
        "url": "https://paintinglocations.com/paintings/enclosed-field-with-peasant/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Gogh%2C_Vincent_van_-_Landscape_at_Saint-R%C3%A9my_%28Enclosed_Field_with_Peasant%29_-_Google_Art_Project.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 18.4
      }
    ]
  },
  "avi": {
    "name": "Avignon",
    "lat": 43.9493,
    "lon": 4.8055,
    "priority": 1,
    "paintings": [
      {
        "title": "The Fountain of Vaucluse",
        "artist": "Thomas Cole",
        "url": "https://paintinglocations.com/paintings/the-fountain-of-vaucluse/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Thomas_Cole_-_The_Fountain_of_Vaucluse_-_1992.14_-_Dallas_Museum_of_Art.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 15.7
      },
      {
        "title": "The Large Plane Trees (Road Menders at Saint-Rémy)",
        "artist": "Vincent van Gogh",
        "url": "https://paintinglocations.com/paintings/the-large-plane-trees-road-menders-at-saint-remy/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/The_Large_Plane_Trees_%28Road_Menders_at_Saint-R%C3%A9my%29%2C_by_Vincent_van_Gogh%2C_Cleveland_Museum_of_Art%2C_1947.209.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 17.9
      },
      {
        "title": "The Starry Night",
        "artist": "Vincent van Gogh",
        "url": "https://paintinglocations.com/paintings/the-starry-night/",
        "image": "https://paintinglocations.com/img/art/the-starry-night/1200.jpg",
        "image_source": "paintinglocations.com",
        "match": "near",
        "km": 17.9
      },
      {
        "title": "View of the Asylum and Chapel of Saint-Rémy",
        "artist": "Vincent van Gogh",
        "url": "https://paintinglocations.com/paintings/view-of-the-asylum-and-chapel-of-saint-remy/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Vincent_Van_Gogh_-_Vue_de_l%27asile_et_de_la_Chapelle_de_Saint-R%C3%A9my.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 17.9
      }
    ]
  },
  "bou": {
    "name": "Boulogne-sur-Mer",
    "lat": 50.7256,
    "lon": 1.6139,
    "priority": 2,
    "paintings": [
      {
        "title": "Clair de lune sur le port de Boulogne",
        "artist": "Édouard Manet",
        "url": "https://paintinglocations.com/paintings/clair-de-lune-sur-le-port-de-boulogne/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Ed._Manet._Clair_de_lune_sur_le_port_de_Boulogne.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 0.0
      }
    ]
  },
  "brg": {
    "name": "Bruges",
    "lat": 51.2093,
    "lon": 3.2247,
    "priority": 2,
    "paintings": [
      {
        "title": "Virgin and Child with Four Angels",
        "artist": "Gerard David",
        "url": "https://paintinglocations.com/paintings/virgin-and-child-with-four-angels/",
        "image": "https://images.metmuseum.org/CRDImages/ep/web-large/DP-1410-001.jpg",
        "image_source": "images.metmuseum.org",
        "match": "exact",
        "km": 0.5
      }
    ]
  },
  "bsn": {
    "name": "Besançon",
    "lat": 47.2378,
    "lon": 6.0241,
    "priority": 2,
    "paintings": [
      {
        "title": "A Burial at Ornans",
        "artist": "Gustave Courbet",
        "url": "https://paintinglocations.com/paintings/a-burial-at-ornans/",
        "image": "https://paintinglocations.com/img/art/a-burial-at-ornans/1200.jpg",
        "image_source": "paintinglocations.com",
        "match": "near",
        "km": 17.3
      }
    ]
  },
  "buf": {
    "name": "Buffalo",
    "lat": 42.8864,
    "lon": -78.8784,
    "priority": 2,
    "paintings": [
      {
        "title": "Niagara",
        "artist": "Frederic Edwin Church",
        "url": "https://paintinglocations.com/paintings/niagara/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Niagara_by_Frederic_Edwin_Church%2C_1857_-_Corcoran_Gallery_of_Art_-_DSC01135.JPG?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 26.6
      }
    ]
  },
  "cha": {
    "name": "Chartres",
    "lat": 48.4469,
    "lon": 1.4892,
    "priority": 2,
    "paintings": [
      {
        "title": "Chartres Cathedral",
        "artist": "Jean-Baptiste Camille Corot",
        "url": "https://paintinglocations.com/paintings/chartres-cathedral/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Jean-Baptiste-Camille_Corot_-_The_Cathedral_of_Chartres_-_WGA5282.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 0.1
      }
    ]
  },
  "dre": {
    "name": "Dresden",
    "lat": 51.0504,
    "lon": 13.7373,
    "priority": 2,
    "paintings": [
      {
        "title": "Dresden From the Right Bank of the Elbe Below the Augustus Bridge",
        "artist": "Bernardo Bellotto",
        "url": "https://paintinglocations.com/paintings/dresden-from-the-right-bank-of-the-elbe-below-the-augustus-bridge/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Canaletto_-_Dresden_seen_from_the_Right_Bank_of_the_Elbe%2C_beneath_the_Augusts_Bridge_-_Google_Art_Project.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 0.3
      }
    ]
  },
  "ein": {
    "name": "Eindhoven",
    "lat": 51.4416,
    "lon": 5.4697,
    "priority": 2,
    "paintings": [
      {
        "title": "Water Mill at Kollen near Nuenen",
        "artist": "Vincent van Gogh",
        "url": "https://paintinglocations.com/paintings/water-mill-at-kollen-near-nuenen/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Vincent_van_Gogh_-_Water_mill_at_Kollen_%281884%29.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 4.7
      }
    ]
  },
  "exe": {
    "name": "Exeter",
    "lat": 50.7184,
    "lon": -3.5339,
    "priority": 2,
    "paintings": [
      {
        "title": "The Boyhood of Raleigh",
        "artist": "John Everett Millais",
        "url": "https://paintinglocations.com/paintings/the-boyhood-of-raleigh/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/John_Everett_Millais_%281829-1896%29_-_The_Boyhood_of_Raleigh_-_N01691_-_National_Gallery.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 18.0
      }
    ]
  },
  "fbl": {
    "name": "Fontainebleau",
    "lat": 48.4056,
    "lon": 2.7016,
    "priority": 1,
    "paintings": [
      {
        "title": "The Canal du Loing at Moret",
        "artist": "Alfred Sisley",
        "url": "https://paintinglocations.com/paintings/the-canal-du-loing-at-moret/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Alfred_Sisley_-_The_Loing%27s_Canal_-_Google_Art_Project.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 9.2
      },
      {
        "title": "Le Déjeuner sur l'herbe",
        "artist": "Claude Monet",
        "url": "https://paintinglocations.com/paintings/le-dejeuner-sur-l-herbe/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Monet_dejeunersurlherbe.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 9.8
      },
      {
        "title": "Lise with a Parasol",
        "artist": "Pierre-Auguste Renoir",
        "url": "https://paintinglocations.com/paintings/lise-with-a-parasol/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Lise_with_a_Parasol.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 9.8
      },
      {
        "title": "The Angelus",
        "artist": "Jean-François Millet",
        "url": "https://paintinglocations.com/paintings/the-angelus/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/JEAN-FRAN%C3%87OIS_MILLET_-_El_%C3%81ngelus_%28Museo_de_Orsay%2C_1857-1859._%C3%93leo_sobre_lienzo%2C_55.5_x_66_cm%29.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 9.8
      },
      {
        "title": "Pont de Maincy",
        "artist": "Paul Cézanne",
        "url": "https://paintinglocations.com/paintings/pont-de-maincy/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Pont_de_Maincy%2C_par_Paul_C%C3%A9zanne.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 16.2
      }
    ]
  },
  "gen": {
    "name": "Genoa",
    "lat": 44.4056,
    "lon": 8.9463,
    "priority": 2,
    "paintings": [
      {
        "title": "Capo di Noli, near Genoa",
        "artist": "Paul Signac",
        "url": "https://paintinglocations.com/paintings/capo-di-noli-near-genoa/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Capo_di_Noli_-_Paul_Signac_-_Wallraf-Richartz-Museum_%26_Fondation_Corboud-6004_%28without_frame%29.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 13.5
      }
    ]
  },
  "has": {
    "name": "Hastings",
    "lat": 50.8543,
    "lon": 0.5731,
    "priority": 3,
    "paintings": [
      {
        "title": "The Blind Girl",
        "artist": "John Everett Millais",
        "url": "https://paintinglocations.com/paintings/the-blind-girl/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/John_Everett_Millais_-_The_Blind_Girl%2C_1854-56.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 12.3
      }
    ]
  },
  "hsg": {
    "name": "Helsingør",
    "lat": 56.0361,
    "lon": 12.6131,
    "priority": 3,
    "paintings": [
      {
        "title": "The Russian Ship of the Line \"Asow\" and a Frigate at Anchor in the Roads of Elsinore",
        "artist": "Christoffer Wilhelm Eckersberg",
        "url": "https://paintinglocations.com/paintings/the-russian-ship-of-the-line-asow-and-a-frigate-at-anchor-in-the-roads-of-elsino/",
        "image": "https://paintinglocations.com/img/art/the-russian-ship-of-the-line-asow-and-a-frigate-at-anchor-in-the-roads-of-elsino/1200.jpg",
        "image_source": "paintinglocations.com",
        "match": "exact",
        "km": 2.7
      }
    ]
  },
  "lhv": {
    "name": "Le Havre",
    "lat": 49.4944,
    "lon": 0.1079,
    "priority": 1,
    "paintings": [
      {
        "title": "Impression, Sunrise",
        "artist": "Claude Monet",
        "url": "https://paintinglocations.com/paintings/impression-sunrise/",
        "image": "https://paintinglocations.com/img/art/impression-sunrise/1200.jpg",
        "image_source": "paintinglocations.com",
        "match": "exact",
        "km": 0.9
      },
      {
        "title": "Garden at Sainte-Adresse",
        "artist": "Claude Monet",
        "url": "https://paintinglocations.com/paintings/garden-at-sainte-adresse/",
        "image": "https://paintinglocations.com/img/art/garden-at-sainte-adresse/1200.jpg",
        "image_source": "paintinglocations.com",
        "match": "exact",
        "km": 2.2
      },
      {
        "title": "Regatta at Sainte-Adresse",
        "artist": "Claude Monet",
        "url": "https://paintinglocations.com/paintings/regatta-at-sainte-adresse/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Claude_Monet%2C_1867%2C_Regatta_at_Sainte-Adresse%2C_Metropolitan_Museum_of_Art.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 2.2
      },
      {
        "title": "The Beach at Sainte-Adresse",
        "artist": "Claude Monet",
        "url": "https://paintinglocations.com/paintings/the-beach-at-sainte-adresse/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Claude%20Monet%20-%20The%20Beach%20at%20Sainte-Adresse%20-%20Google%20Art%20Project.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 2.2
      },
      {
        "title": "Woman in the Garden",
        "artist": "Claude Monet",
        "url": "https://paintinglocations.com/paintings/woman-in-the-garden/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Claude_Monet_022.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 2.2
      },
      {
        "title": "Boating",
        "artist": "Édouard Manet",
        "url": "https://paintinglocations.com/paintings/boating/",
        "image": "https://images.metmuseum.org/CRDImages/ep/web-large/DP-25466-001.jpg",
        "image_source": "images.metmuseum.org",
        "match": "exact",
        "km": 6.7
      },
      {
        "title": "Fishermen in Poissy",
        "artist": "Claude Monet",
        "url": "https://paintinglocations.com/paintings/fishermen-in-poissy/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Claude_Monet_021.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 6.7
      },
      {
        "title": "La Grenouillère",
        "artist": "Pierre-Auguste Renoir",
        "url": "https://paintinglocations.com/paintings/la-grenouillere/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/La_Grenouill%C3%A8re_%28Auguste_Renoir%29_-_Nationalmuseum_-_19486.tif?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 6.7
      },
      {
        "title": "On the Banks of the Seine, Bennecourt",
        "artist": "Claude Monet",
        "url": "https://paintinglocations.com/paintings/on-the-banks-of-the-seine-bennecourt/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Claude%20Monet%20-%20On%20the%20Bank%20of%20the%20Seine%2C%20Bennecourt%20-%201922.427%20-%20Art%20Institute%20of%20Chicago.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 6.7
      },
      {
        "title": "A Cart on the Snowy Road at Honfleur",
        "artist": "Claude Monet",
        "url": "https://paintinglocations.com/paintings/a-cart-on-the-snowy-road-at-honfleur/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Monet%2C_A_Cart_on_the_Snowy_Road_at_Honfleur_%281865_or_1867%29.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 12.3
      },
      {
        "title": "The Road in Front of Saint-Simeon Farm in Winter",
        "artist": "Claude Monet",
        "url": "https://paintinglocations.com/paintings/the-road-in-front-of-saint-simeon-farm-in-winter/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/1867_The_Road_in_front_of_Saint-Simeon_Farm_in_Winter.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 12.3
      },
      {
        "title": "The Magpie",
        "artist": "Claude Monet",
        "url": "https://paintinglocations.com/paintings/the-magpie/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Claude_Monet_-_The_Magpie_-_Google_Art_Project.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 24.6
      }
    ]
  },
  "lrt": {
    "name": "Lorient",
    "lat": 47.7483,
    "lon": -3.3667,
    "priority": 3,
    "paintings": [
      {
        "title": "The Port at Lorient",
        "artist": "Berthe Morisot",
        "url": "https://paintinglocations.com/paintings/the-port-at-lorient/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Berthe_Morisot_The_Harbor_at_Lorient.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 0.3
      }
    ]
  },
  "mai": {
    "name": "Maidenhead",
    "lat": 51.5214,
    "lon": -0.7185,
    "priority": 3,
    "paintings": [
      {
        "title": "Rain, Steam and Speed – The Great Western Railway",
        "artist": "J. M. W. Turner",
        "url": "https://paintinglocations.com/paintings/rain-steam-and-speed-the-great-western-railway/",
        "image": "https://paintinglocations.com/img/art/rain-steam-and-speed-the-great-western-railway/1200.jpg",
        "image_source": "paintinglocations.com",
        "match": "exact",
        "km": 1.2
      }
    ]
  },
  "mek": {
    "name": "Meknès",
    "lat": 33.8935,
    "lon": -5.5473,
    "priority": 2,
    "paintings": [
      {
        "title": "Muley-Abd-Err-Rahmann, sultan du Maroc sortant de son palais de Mequinez",
        "artist": "Eugène Delacroix",
        "url": "https://paintinglocations.com/paintings/muley-abd-err-rahmann-sultan-du-maroc-sortant-de-son-palais-de-mequinez/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Augustins_-_Le_Sultan_du_Maroc_-_Eug%C3%A8ne_Delacroix.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 1.6
      }
    ]
  },
  "mtp": {
    "name": "Montpellier",
    "lat": 43.6108,
    "lon": 3.8767,
    "priority": 1,
    "paintings": [
      {
        "title": "Réunion de famille",
        "artist": "Frédéric Bazille",
        "url": "https://paintinglocations.com/paintings/reunion-de-famille/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/R%C3%A9union_de_famille_-_Fr%C3%A9d%C3%A9ric_Bazille_-_mus%C3%A9e_d%27Orsay_RF_2749.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 2.9
      },
      {
        "title": "The Pink Dress",
        "artist": "Frédéric Bazille",
        "url": "https://paintinglocations.com/paintings/the-pink-dress/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Fr%C3%A9d%C3%A9ric_Bazille_-_The_Pink_Dress_-_Google_Art_Project.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 3.4
      },
      {
        "title": "The Beach at Palavas",
        "artist": "Gustave Courbet",
        "url": "https://paintinglocations.com/paintings/the-beach-at-palavas/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Gustave_Courbet_-_Le_bord_de_mer_%C3%A0_Palavas_%281854%29.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 10.0
      }
    ]
  },
  "nnc": {
    "name": "Nancy",
    "lat": 48.6921,
    "lon": 6.1844,
    "priority": 2,
    "paintings": [
      {
        "title": "The Lovers (Autumn Evening)",
        "artist": "Émile Friant",
        "url": "https://paintinglocations.com/paintings/the-lovers-autumn-evening/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Emile_Friant-Les_Amoureux-Mus%C3%A9e_des_beaux-arts_de_Nancy.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 1.2
      }
    ]
  },
  "pgn": {
    "name": "Perpignan",
    "lat": 42.6987,
    "lon": 2.8956,
    "priority": 2,
    "paintings": [
      {
        "title": "The Open Window",
        "artist": "Henri Matisse",
        "url": "https://paintinglocations.com/paintings/the-open-window/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Fen%C3%AAtre_ouverte%2C_Collioure%2C_par_Henri_Matisse.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 24.5
      },
      {
        "title": "The Roofs of Collioure",
        "artist": "Henri Matisse",
        "url": "https://paintinglocations.com/paintings/the-roofs-of-collioure/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Les_Toits_de_Collioure%2C_par_Henri_Matisse.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 24.5
      }
    ]
  },
  "qmp": {
    "name": "Quimper",
    "lat": 47.996,
    "lon": -4.1026,
    "priority": 3,
    "paintings": [
      {
        "title": "The Green Christ",
        "artist": "Paul Gauguin",
        "url": "https://paintinglocations.com/paintings/the-green-christ/",
        "image": "https://paintinglocations.com/img/art/the-green-christ/1200.jpg",
        "image_source": "paintinglocations.com",
        "match": "near",
        "km": 29.0
      }
    ]
  },
  "svs": {
    "name": "Southend-on-Sea",
    "lat": 51.5459,
    "lon": 0.7077,
    "priority": 2,
    "paintings": [
      {
        "title": "Hadleigh Castle, The Mouth of the Thames--Morning after a Stormy Night",
        "artist": "John Constable",
        "url": "https://paintinglocations.com/paintings/hadleigh-castle-the-mouth-of-the-thames-morning-after-a-stormy-night/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/John_Constable_-_Hadleigh_Castle%2C_The_Mouth_of_the_Thames--Morning_after_a_Stormy_Night_-_Google_Art_Project.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 6.8
      }
    ]
  },
  "tbg": {
    "name": "Tønsberg",
    "lat": 59.2675,
    "lon": 10.4076,
    "priority": 2,
    "paintings": [
      {
        "title": "Starry Night",
        "artist": "Edvard Munch",
        "url": "https://paintinglocations.com/paintings/starry-night/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Edvard_Munch_-_Starry_Night_%281893_Getty%29.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 9.7
      },
      {
        "title": "Anxiety",
        "artist": "Edvard Munch",
        "url": "https://paintinglocations.com/paintings/anxiety/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Edvard_Munch_-_Anxiety_-_Google_Art_Project.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 18.9
      }
    ]
  },
  "tol": {
    "name": "Toledo",
    "lat": 39.8628,
    "lon": -4.0273,
    "priority": 3,
    "paintings": [
      {
        "title": "View and Plan of Toledo",
        "artist": "El Greco",
        "url": "https://paintinglocations.com/paintings/view-and-plan-of-toledo/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/El_Greco_-_View_and_Plan_of_Toledo_-_Google_Art_Project.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 0.7
      }
    ]
  },
  "utr": {
    "name": "Utrecht",
    "lat": 52.0907,
    "lon": 5.1214,
    "priority": 2,
    "paintings": [
      {
        "title": "The Windmill at Wijk bij Duurstede",
        "artist": "Jacob van Ruisdael",
        "url": "https://paintinglocations.com/paintings/the-windmill-at-wijk-bij-duurstede/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/De_molen_bij_Wijk_bij_Duurstede_Rijksmuseum_SK-C-211.jpeg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "near",
        "km": 20.5
      }
    ]
  },
  "vrn": {
    "name": "Vernon",
    "lat": 49.092,
    "lon": 1.483,
    "priority": 3,
    "paintings": [
      {
        "title": "The artist's garden at Giverny",
        "artist": "Claude Monet",
        "url": "https://paintinglocations.com/paintings/the-artist-s-garden-at-giverny/",
        "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Monet_-_Monets_Garten_in_Giverny.jpg?width=1600",
        "image_source": "commons.wikimedia.org",
        "match": "exact",
        "km": 4.0
      }
    ]
  }
};
