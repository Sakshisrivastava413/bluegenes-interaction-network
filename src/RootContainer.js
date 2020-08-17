import React, { useEffect, useState } from 'react';
import { queryData } from './query';
import GeneInteractionNetwork from './components/GeneInteractionNetwork';
import InteractionDetail from './components/InteractionDetail';
import FilterPanel from './components/FilterPanel';
import Loading from './components/Loading';

const RootContainer = ({ serviceUrl, entity }) => {
	const [data, setData] = useState([]);
	const [loading, setloading] = useState(false);
	const [selectedNodeData, setSelectedNodeData] = useState({});
	const [selectedInteraction, ChangeInteractionType] = useState('Both');
	const [physicalTypeData, setPhysicalData] = useState([]);
	const [geneticTypeData, setGeneticData] = useState([]);
	const [filteredData, setFilteredData] = useState([]);
	const [sharedInteractionData, setSharedInteractionData] = useState([]);
	const [toggleStatus, setToggleStatus] = useState(true);

	useEffect(() => {
		setloading(true);
		let { value } = entity;
		queryData({
			serviceUrl: serviceUrl,
			geneId: !Array.isArray(value) ? [value] : value
		}).then(data => {
			setloading(false);
			setData(data);
			setFilteredData(data);
			separateDataAccToType(data);
		});
	}, []);

	useEffect(() => {
		const counts = new Map();
		filteredData.forEach(geneData => {
			geneData &&
				geneData.interactions &&
				geneData.interactions.filter(item => {
					let count = counts.get(item.participant2.primaryIdentifier);
					let freq, gene;
					if (typeof count !== 'undefined') {
						freq = count[0];
						gene = count[1];
					}
					counts.set(
						item.participant2.primaryIdentifier,
						count ? [freq + 1, [...gene, geneData]] : [1, [geneData]]
					);
					return count === 1;
				});
		});
		const map = {};
		for (const [key, value] of counts.entries()) {
			const freq = value[0],
				geneArr = value[1];
			if (freq > 1) {
				const filteredMap = geneArr.map(item => ({
					...item,
					interactions: item.interactions.filter(
						g => g.participant2.primaryIdentifier === key
					)
				}));
				filteredMap.forEach(item => {
					if (!map[item.symbol]) map[item.symbol] = item;
					else map[item.symbol].interactions.push(...item.interactions);
				});
			}
		}
		setSharedInteractionData([...Object.values(map)]);
	}, [filteredData]);

	const separateDataAccToType = data => {
		const phyTypeArr = [],
			genTypeArr = [];
		data.forEach(parentData => {
			const phyInteraction = [],
				genInteraction = [];
			parentData.interactions.forEach(int => {
				let p = false,
					g = false;
				int.details.forEach(e => {
					if (!p && e.type == 'physical') {
						phyInteraction.push(int);
						p = true;
					}
					if (!g && e.type == 'genetic') {
						genInteraction.push(int);
						g = true;
					}
				});
			});
			phyTypeArr.push({ ...parentData, ['interactions']: phyInteraction });
			genTypeArr.push({ ...parentData, ['interactions']: genInteraction });
		});

		setPhysicalData(phyTypeArr);
		setGeneticData(genTypeArr);
	};

	const getSelectedNodeData = node => {
		const { data, edges } = node.target[0]._private;
		const { target } = edges[0]._private.data;
		data.parent = target;
		setSelectedNodeData(data);
	};

	const applyFilter = ev => {
		const { value } = ev.target;
		ChangeInteractionType(value);
		if (value == 'Physical') setFilteredData(physicalTypeData);
		else if (value == 'Genetic') setFilteredData(geneticTypeData);
		else if (value == 'Both') setFilteredData(data);
	};

	return (
		<div className="rootContainer">
			{loading ? (
				<Loading />
			) : (
				<div className="innerContainer">
					<div className="graph">
						{data.length ? (
							<GeneInteractionNetwork
								data={toggleStatus ? sharedInteractionData : filteredData}
								sendNodeData={getSelectedNodeData}
							/>
						) : (
							<h2>Data Not Found!</h2>
						)}
					</div>
					<div className="controls">
						<FilterPanel
							applyFilter={applyFilter}
							selectedInteraction={selectedInteraction}
							updateToggle={() => setToggleStatus(!toggleStatus)}
							toggleStatus={toggleStatus}
						/>
						<InteractionDetail nodeData={selectedNodeData} />
					</div>
				</div>
			)}
		</div>
	);
};

export default RootContainer;
