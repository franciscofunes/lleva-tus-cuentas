const DEFAULT_PARAMS = {
	model: 'text-davinci-003',
	temperature: 0.7,
	max_tokens: 50,
	top_p: 1,
	frequency_penalty: 0,
	presence_penalty: 0,
};

export async function openaiQuery(params = {}) {
	const params_ = { ...DEFAULT_PARAMS, ...params };
	const requestOptions = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Bearer ' + String(process.env.REACT_APP_OPENAI_API_KEY),
		},
		body: JSON.stringify(params_),
	};

	const response = await fetch(
		'https://api.openai.com/v1/completions',
		requestOptions
	);

	const data = await response.json();

	if (data.choices && data.choices.length > 0) {
		return data.choices[0].text;
	} else {
		throw new Error('No response or empty choices array');
	}
}
