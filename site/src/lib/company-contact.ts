export const COMPANY_ADDRESS = {
  street: "Rua Júlia Maksude, 471",
  neighborhood: "Monte Castelo, Campo Grande–MS",
  cep: "79011-100",
  searchQuery:
    "Rua Júlia Maksude, 471, Monte Castelo, Campo Grande, MS, 79011-100",
  displayLines: [
    "Rua Júlia Maksude, 471",
    "Monte Castelo, Campo Grande–MS",
    "CEP 79011-100",
  ] as const,
};

const encodedAddressQuery = encodeURIComponent(COMPANY_ADDRESS.searchQuery);

export const GOOGLE_MAPS_URL = `https://maps.google.com/?q=${encodedAddressQuery}`;

/** Usa o mesmo endereço da busca para o iframe geocodificar o ponto correto. */
export const GOOGLE_MAPS_EMBED_URL = `https://www.google.com/maps?q=${encodedAddressQuery}&hl=pt-BR&z=16&output=embed`;
