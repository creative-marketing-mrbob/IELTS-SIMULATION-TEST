import { IELTSTest } from '../types/testSchema';

export const cambridgeOfficialTest: IELTSTest = {
  test_id: "CAMBRIDGE-IELTS-17-18-OFFICIAL",
  title: "Cambridge IELTS Official Examination Suite",
  type: "Academic",
  version: "Cambridge 17/18 Official Test 4",
  sections: [
    // =========================================================================
    // SECTION 1: READING — IELTS Cambridge Book 17 Reading Test 4 (Questions 1–40)
    // =========================================================================
    {
      section_id: "reading-cambridge-17-test-4",
      section_type: "reading",
      order: 1,
      title: "Reading Section",
      instructions: "You should spend about 60 minutes on Questions 1–40, which are based on Reading Passages 1, 2 and 3 below.",
      time_limit_minutes: 60,
      parts: [
        // -------------------------------------------------------------
        // Reading Passage 1: Bats to the rescue (Questions 1–13)
        // -------------------------------------------------------------
        {
          id: 1,
          title: "Reading Passage 1: Bats to the rescue",
          subtitle: "How bats help farmers fight crop pests in Madagascar",
          order: 1,
          content: [
            "Paragraph 1: In Madagascar, where half the population is undernourished and agriculture is the economic backbone, pest insects present a constant challenge. Rice is the staple crop, but smallholder farmers frequently lose significant portions of their harvest to insect pests like the rice grasshopper and white stem borer. In response, an international team of conservation biologists led by Dr. Ricardo Rocha investigated whether insectivorous bats could provide a natural pest-control service.",
            "Paragraph 2: Rocha and his colleagues focused on the Ranomafana National Park buffer zone in southeastern Madagascar. They used mist nets and harp traps to capture bats across agricultural fields and native forest edges. By analyzing the DNA found in bat droppings (guano), the team identified exactly which insects the bats were eating. The molecular fecal analysis revealed that Madagascar's bats consume vast quantities of devastating agricultural pests, notably the white stem borer, the grasshopper, and several species of moth caterpillars that feed on coffee and cocoa crops.",
            "Paragraph 3: Importantly, the researchers discovered that bats forage extensively over cultivated rice fields, especially during the planting and harvest seasons when insect abundance peaks. A single colony of insectivorous bats can consume millions of insects in a single night, including disease vectors like mosquitoes. This ecological service provides substantial financial savings for subsistence farmers who would otherwise struggle to afford commercial insecticides. Bats also contribute indirect ecological benefits: their protein-rich diet results in nitrogen-heavy guano that enriches soil fertility.",
            "Paragraph 4: Despite their enormous ecological value, bats in Madagascar have historically faced negative cultural perceptions and habitat loss. In some rural communities, bats are viewed as unclean or associated with misfortune in local folklore culture. Additionally, traditional roosting trees in primary forests are being cleared for charcoal production and slash-and-burn agriculture. However, researchers found that certain bat species are remarkably adaptable, roosting in the roofs of human houses and schools when natural tree hollows are scarce.",
            "Paragraph 5: Dr. Rocha emphasizes that fostering bat-friendly environments—such as constructing dedicated bat roost boxes and promoting educational campaigns—can turn these maligned mammals into celebrated allies for sustainable food production and rural poverty alleviation."
          ],
          questions: [
            {
              question_number: 1,
              question_type: "true-false-not-given",
              instruction: "Do the following statements agree with the information given in Reading Passage 1?",
              prompt: "Smallholder farmers in Madagascar rarely experience crop losses caused by insect pests.",
              options: [
                { label: "TRUE", text: "TRUE (if the statement agrees with the information)" },
                { label: "FALSE", text: "FALSE (if the statement contradicts the information)" },
                { label: "NOT GIVEN", text: "NOT GIVEN (if there is no information on this)" }
              ],
              correct_answer: "FALSE",
              acceptable_answers: ["FALSE", "F"],
              order: 1,
              explanation: "Paragraph 1 states farmers frequently lose significant portions of harvest to pests."
            },
            {
              question_number: 2,
              question_type: "true-false-not-given",
              instruction: "Do the following statements agree with the information given in Reading Passage 1?",
              prompt: "Dr. Ricardo Rocha's team used chemical pesticides to capture bats near Ranomafana National Park.",
              options: [
                { label: "TRUE", text: "TRUE (if the statement agrees with the information)" },
                { label: "FALSE", text: "FALSE (if the statement contradicts the information)" },
                { label: "NOT GIVEN", text: "NOT GIVEN (if there is no information on this)" }
              ],
              correct_answer: "FALSE",
              acceptable_answers: ["FALSE", "F"],
              order: 2,
              explanation: "Paragraph 2 states they used mist nets and harp traps."
            },
            {
              question_number: 3,
              question_type: "true-false-not-given",
              instruction: "Do the following statements agree with the information given in Reading Passage 1?",
              prompt: "The white stem borer is the most expensive pest insect to eradicate in Africa.",
              options: [
                { label: "TRUE", text: "TRUE (if the statement agrees with the information)" },
                { label: "FALSE", text: "FALSE (if the statement contradicts the information)" },
                { label: "NOT GIVEN", text: "NOT GIVEN (if there is no information on this)" }
              ],
              correct_answer: "NOT GIVEN",
              acceptable_answers: ["NOT GIVEN", "NG"],
              order: 3,
              explanation: "Passage does not compare expense against all African pests."
            },
            {
              question_number: 4,
              question_type: "true-false-not-given",
              instruction: "Do the following statements agree with the information given in Reading Passage 1?",
              prompt: "Bats consume larger numbers of insects during periods when crop planting and harvesting take place.",
              options: [
                { label: "TRUE", text: "TRUE (if the statement agrees with the information)" },
                { label: "FALSE", text: "FALSE (if the statement contradicts the information)" },
                { label: "NOT GIVEN", text: "NOT GIVEN (if there is no information on this)" }
              ],
              correct_answer: "TRUE",
              acceptable_answers: ["TRUE", "T"],
              order: 4,
              explanation: "Paragraph 3 explicitly confirms bats forage especially during planting and harvest seasons."
            },
            {
              question_number: 5,
              question_type: "true-false-not-given",
              instruction: "Do the following statements agree with the information given in Reading Passage 1?",
              prompt: "Commercial insecticides are provided free of charge by the Malagasy government.",
              options: [
                { label: "TRUE", text: "TRUE (if the statement agrees with the information)" },
                { label: "FALSE", text: "FALSE (if the statement contradicts the information)" },
                { label: "NOT GIVEN", text: "NOT GIVEN (if there is no information on this)" }
              ],
              correct_answer: "NOT GIVEN",
              acceptable_answers: ["NOT GIVEN", "NG"],
              order: 5,
              explanation: "No mention of government free provision in text."
            },
            {
              question_number: 6,
              question_type: "true-false-not-given",
              instruction: "Do the following statements agree with the information given in Reading Passage 1?",
              prompt: "Some bat species have adapted to living inside man-made buildings when natural forest roosts are lost.",
              options: [
                { label: "TRUE", text: "TRUE (if the statement agrees with the information)" },
                { label: "FALSE", text: "FALSE (if the statement contradicts the information)" },
                { label: "NOT GIVEN", text: "NOT GIVEN (if there is no information on this)" }
              ],
              correct_answer: "TRUE",
              acceptable_answers: ["TRUE", "T"],
              order: 6,
              explanation: "Paragraph 4 explains bats roost in roofs of human houses and schools."
            },
            {
              question_number: 7,
              question_type: "sentence-completion",
              instruction: "Complete the notes below. Write ONE WORD ONLY from the passage for each answer.",
              prompt: "Researchers identified the diet of bats by analyzing DNA extracted from their bat ______.",
              correct_answer: "droppings",
              acceptable_answers: ["droppings", "guano"],
              order: 7,
              explanation: "Paragraph 2: 'By analyzing the DNA found in bat droppings (guano)...'"
            },
            {
              question_number: 8,
              question_type: "sentence-completion",
              instruction: "Complete the notes below. Write ONE WORD ONLY from the passage for each answer.",
              prompt: "In addition to rice pests, bats feed on moths that damage cocoa and ______ crops.",
              correct_answer: "coffee",
              acceptable_answers: ["coffee"],
              order: 8,
              explanation: "Paragraph 2 mentions caterpillars feeding on coffee and cocoa crops."
            },
            {
              question_number: 9,
              question_type: "sentence-completion",
              instruction: "Complete the notes below. Write ONE WORD ONLY from the passage for each answer.",
              prompt: "Bats provide health benefits to local communities by consuming disease-transmitting ______.",
              correct_answer: "mosquitoes",
              acceptable_answers: ["mosquitoes", "mosquito"],
              order: 9,
              explanation: "Paragraph 3: 'including disease vectors like mosquitoes.'"
            },
            {
              question_number: 10,
              question_type: "sentence-completion",
              instruction: "Complete the notes below. Write ONE WORD ONLY from the passage for each answer.",
              prompt: "Bat droppings enrich agricultural soil because their insect diet is high in ______.",
              correct_answer: "protein",
              acceptable_answers: ["protein"],
              order: 10,
              explanation: "Paragraph 3: 'their protein-rich diet results in nitrogen-heavy guano...'"
            },
            {
              question_number: 11,
              question_type: "sentence-completion",
              instruction: "Complete the notes below. Write ONE WORD ONLY from the passage for each answer.",
              prompt: "In some rural traditions, bats have a negative reputation because they are perceived as ______.",
              correct_answer: "unclean",
              acceptable_answers: ["unclean"],
              order: 11,
              explanation: "Paragraph 4: 'bats are viewed as unclean or associated with misfortune...'"
            },
            {
              question_number: 12,
              question_type: "sentence-completion",
              instruction: "Complete the notes below. Write ONE WORD ONLY from the passage for each answer.",
              prompt: "Negative attitudes towards bats stem largely from traditional folklore and local ______.",
              correct_answer: "culture",
              acceptable_answers: ["culture"],
              order: 12,
              explanation: "Paragraph 4 mentions local folklore culture."
            },
            {
              question_number: 13,
              question_type: "sentence-completion",
              instruction: "Complete the notes below. Write ONE WORD ONLY from the passage for each answer.",
              prompt: "When natural tree hollows are destroyed, bats seek shelter inside the roofs of human ______.",
              correct_answer: "houses",
              acceptable_answers: ["houses", "house"],
              order: 13,
              explanation: "Paragraph 4: 'roosting in the roofs of human houses and schools...'"
            }
          ]
        },

        // -------------------------------------------------------------
        // Reading Passage 2: Does education fuel economic growth? (Questions 14–26)
        // -------------------------------------------------------------
        {
          id: 2,
          title: "Reading Passage 2: Does education fuel economic growth?",
          subtitle: "An historical investigation into the economic returns of mass schooling",
          order: 2,
          content: [
            "Paragraph A: For decades, politicians and development economists have operated under the assumption that increasing public expenditure on formal schooling leads directly to national economic prosperity. In the orthodox view, education builds human capital, increases worker productivity, and fosters technological innovation. However, historical economic data suggests a far more complex and nuanced relationship.",
            "Paragraph B: In eighteenth-century Britain during the First Industrial Revolution, universal literacy was virtually non-existent. While pioneering engineers and visionary entrepreneurs developed steam engines and mechanized textile looms, the vast majority of factory workers had little or no formal schooling. The rapid expansion of British industrial output occurred decades before the introduction of compulsory primary education in 1870.",
            "Paragraph C: Conversely, in early nineteenth-century Prussia, state-sponsored compulsory schooling achieved the highest literacy rates in Europe. Yet for several decades following these educational reforms, the Prussian economy remained predominantly agrarian and lagged significantly behind industrial Britain. Education alone did not generate immediate industrial momentum without commercial markets, capital infrastructure, and legal protections.",
            "Paragraph D: Economists such as Alison Wolf argue that modern economies often experience 'credential inflation.' When societies expand university access without a corresponding increase in high-skill employment demand, degrees become sorting mechanisms rather than guarantees of enhanced productivity. In many emerging markets, excessive emphasis on tertiary academic degrees has created underemployed graduates while technical sectors suffer severe labor shortages.",
            "Paragraph E: In Renaissance Europe, the transmission of craft knowledge through master-apprentice guilds fostered technical innovation long before centralized academic curricula. The empirical problem-solving of artisans and blacksmiths gave rise to precision clockmaking and metallurgy.",
            "Paragraph F: Historical records show that Puritan religious sermons strongly encouraged literacy so that descendants could read scriptures independently. In Massachusetts, local towns were legally mandated under threat of fine to establish schools, demonstrating that early mass education was driven primarily by religious piety rather than economic industrialization."
          ],
          questions: [
            {
              question_number: 14,
              question_type: "matching",
              instruction: "Which paragraph contains the following information? Write the correct letter, A–F.",
              prompt: "Mention of craft apprenticeship guilds and empirical artisan traditions fostering technical innovation.",
              options: [
                { label: "A", text: "Paragraph A" },
                { label: "B", text: "Paragraph B" },
                { label: "C", text: "Paragraph C" },
                { label: "D", text: "Paragraph D" },
                { label: "E", text: "Paragraph E" },
                { label: "F", text: "Paragraph F" }
              ],
              correct_answer: "E",
              acceptable_answers: ["E"],
              order: 14,
              explanation: "Paragraph E discusses master-apprentice guilds and artisan technical innovation."
            },
            {
              question_number: 15,
              question_type: "matching",
              instruction: "Which paragraph contains the following information? Write the correct letter, A–F.",
              prompt: "The orthodox economic theory that formal education builds human capital and accelerates productivity.",
              options: [
                { label: "A", text: "Paragraph A" },
                { label: "B", text: "Paragraph B" },
                { label: "C", text: "Paragraph C" },
                { label: "D", text: "Paragraph D" },
                { label: "E", text: "Paragraph E" },
                { label: "F", text: "Paragraph F" }
              ],
              correct_answer: "A",
              acceptable_answers: ["A"],
              order: 15,
              explanation: "Paragraph A outlines the standard economic assumption that schooling builds human capital."
            },
            {
              question_number: 16,
              question_type: "matching",
              instruction: "Which paragraph contains the following information? Write the correct letter, A–F.",
              prompt: "An explanation of credential inflation and tertiary degree oversupply in modern job markets.",
              options: [
                { label: "A", text: "Paragraph A" },
                { label: "B", text: "Paragraph B" },
                { label: "C", text: "Paragraph C" },
                { label: "D", text: "Paragraph D" },
                { label: "E", text: "Paragraph E" },
                { label: "F", text: "Paragraph F" }
              ],
              correct_answer: "D",
              acceptable_answers: ["D"],
              order: 16,
              explanation: "Paragraph D discusses credential inflation and surplus university degrees."
            },
            {
              question_number: 17,
              question_type: "matching",
              instruction: "Which paragraph contains the following information? Write the correct letter, A–F.",
              prompt: "Religious sermon influences and legal town mandates in early colonial Massachusetts.",
              options: [
                { label: "A", text: "Paragraph A" },
                { label: "B", text: "Paragraph B" },
                { label: "C", text: "Paragraph C" },
                { label: "D", text: "Paragraph D" },
                { label: "E", text: "Paragraph E" },
                { label: "F", text: "Paragraph F" }
              ],
              correct_answer: "F",
              acceptable_answers: ["F"],
              order: 17,
              explanation: "Paragraph F details Puritan sermons and Massachusetts school laws."
            },
            {
              question_number: 18,
              question_type: "matching",
              instruction: "Which paragraph contains the following information? Write the correct letter, A–F.",
              prompt: "The contrast of high literacy rates in Prussia with its lagging agrarian economy.",
              options: [
                { label: "A", text: "Paragraph A" },
                { label: "B", text: "Paragraph B" },
                { label: "C", text: "Paragraph C" },
                { label: "D", text: "Paragraph D" },
                { label: "E", text: "Paragraph E" },
                { label: "F", text: "Paragraph F" }
              ],
              correct_answer: "C",
              acceptable_answers: ["C"],
              order: 18,
              explanation: "Paragraph C analyzes nineteenth-century Prussia's high literacy vs agrarian delay."
            },
            {
              question_number: 19,
              question_type: "sentence-completion",
              instruction: "Complete the sentences below. Write ONE WORD ONLY from the passage.",
              prompt: "Puritan community leaders emphasized literacy to ensure that their ______ could study scripture.",
              correct_answer: "descendants",
              acceptable_answers: ["descendants", "descendant"],
              order: 19,
              explanation: "Paragraph F mentions ensuring descendants could read scripture."
            },
            {
              question_number: 20,
              question_type: "sentence-completion",
              instruction: "Complete the sentences below. Write ONE WORD ONLY from the passage.",
              prompt: "Public motivation for early literacy was often inspired by a religious ______ delivered in church.",
              correct_answer: "sermon",
              acceptable_answers: ["sermon", "sermons"],
              order: 20,
              explanation: "Paragraph F: 'Puritan religious sermons strongly encouraged literacy...'"
            },
            {
              question_number: 21,
              question_type: "sentence-completion",
              instruction: "Complete the sentences below. Write ONE WORD ONLY from the passage.",
              prompt: "Towns in Massachusetts that failed to establish community schools faced a mandatory ______.",
              correct_answer: "fine",
              acceptable_answers: ["fine"],
              order: 21,
              explanation: "Paragraph F: 'mandated under threat of fine to establish schools...'"
            },
            {
              question_number: 22,
              question_type: "sentence-completion",
              instruction: "Complete the sentences below. Write ONE WORD ONLY from the passage.",
              prompt: "Artisan problem-solving in workshops generated substantial technical ______ without academic curricula.",
              correct_answer: "innovation",
              acceptable_answers: ["innovation", "innovations"],
              order: 22,
              explanation: "Paragraph E: 'fostered technical innovation long before centralized curricula.'"
            },
            {
              question_number: 23,
              question_type: "multiple-choice",
              instruction: "Questions 23 and 24: Choose TWO letters, A–E.",
              prompt: "Which TWO historical factors explain why British industrialization occurred without mass education (Paragraph B)? [First Choice]",
              options: [
                { label: "A", text: "Foreign university scholarships were subsidized by Parliament" },
                { label: "B", text: "Pioneering inventors and entrepreneurs developed mechanized technologies independently" },
                { label: "C", text: "All factory workers were required to pass compulsory exams" },
                { label: "D", text: "Primary schools were banned by industrial employers" },
                { label: "E", text: "Industrial output expanded decades before compulsory schooling legislation in 1870" }
              ],
              correct_answer: "B",
              acceptable_answers: ["B", "E"],
              order: 23,
              explanation: "B and E are both confirmed in Paragraph B."
            },
            {
              question_number: 24,
              question_type: "multiple-choice",
              instruction: "Questions 23 and 24: Choose TWO letters, A–E.",
              prompt: "Which TWO historical factors explain why British industrialization occurred without mass education (Paragraph B)? [Second Choice]",
              options: [
                { label: "A", text: "Foreign university scholarships were subsidized by Parliament" },
                { label: "B", text: "Pioneering inventors and entrepreneurs developed mechanized technologies independently" },
                { label: "C", text: "All factory workers were required to pass compulsory exams" },
                { label: "D", text: "Primary schools were banned by industrial employers" },
                { label: "E", text: "Industrial output expanded decades before compulsory schooling legislation in 1870" }
              ],
              correct_answer: "E",
              acceptable_answers: ["B", "E"],
              order: 24,
              explanation: "B and E are both confirmed in Paragraph B."
            },
            {
              question_number: 25,
              question_type: "multiple-choice",
              instruction: "Questions 25 and 26: Choose TWO letters, A–E.",
              prompt: "Which TWO problems associated with credential inflation are identified by economists (Paragraph D)? [First Choice]",
              options: [
                { label: "A", text: "A complete decline in international university enrollments" },
                { label: "B", text: "A surplus of underemployed graduates in academic fields" },
                { label: "C", text: "The immediate bankruptcy of all vocational schools" },
                { label: "D", text: "Severe labor shortages in technical and vocational sectors" },
                { label: "E", text: "The elimination of all hiring requirements in corporations" }
              ],
              correct_answer: "B",
              acceptable_answers: ["B", "D"],
              order: 25,
              explanation: "B and D are both confirmed in Paragraph D."
            },
            {
              question_number: 26,
              question_type: "multiple-choice",
              instruction: "Questions 25 and 26: Choose TWO letters, A–E.",
              prompt: "Which TWO problems associated with credential inflation are identified by economists (Paragraph D)? [Second Choice]",
              options: [
                { label: "A", text: "A complete decline in international university enrollments" },
                { label: "B", text: "A surplus of underemployed graduates in academic fields" },
                { label: "C", text: "The immediate bankruptcy of all vocational schools" },
                { label: "D", text: "Severe labor shortages in technical and vocational sectors" },
                { label: "E", text: "The elimination of all hiring requirements in corporations" }
              ],
              correct_answer: "D",
              acceptable_answers: ["B", "D"],
              order: 26,
              explanation: "B and D are both confirmed in Paragraph D."
            }
          ]
        },

        // -------------------------------------------------------------
        // Reading Passage 3: Timur Gareyev – blindfold chess champion (Questions 27–40)
        // -------------------------------------------------------------
        {
          id: 3,
          title: "Reading Passage 3: Timur Gareyev – blindfold chess champion",
          subtitle: "Cognitive endurance and spatial memory in simultaneous blindfold chess",
          order: 3,
          content: [
            "Paragraph A: In December 2016, Grandmaster Timur Gareyev set a new world record for blindfold chess by playing 48 opponents simultaneously while blindfolded. For over 19 consecutive hours, Gareyev sat in a room without sight of any board, pedaling an exercise bike to maintain blood circulation while keeping mental representations of 48 individual 64-square chessboards in his working memory.",
            "Paragraph B: Blindfold chess requires an astonishing degree of spatial visualization and working memory capacity. Gareyev was not merely memorizing static snapshots; he was dynamically updating the coordinates and tactical threats of over 1,500 chess pieces with every move announced by the match arbiter.",
            "Paragraph C: Cognitive neuroscientists who studied Gareyev noted that his visual cortex and parietal lobes exhibited hyper-efficient neural connectivity. Unlike novice players who attempt to memorize piece positions by verbalizing coordinates, elite grandmasters encode board relationships as integrated visual chunks.",
            "Paragraph D: Interestingly, Gareyev employs mnemonic visualization techniques known as the 'memory palace' or method of loci. He mentally associates each board number with distinct real-world locations, visual colors, and sensory impressions. This spatial scaffolding prevents different game positions from interfering with one another in his memory.",
            "Paragraph E: Communication during the record attempt had to be flawlessly coordinated. An assistant read aloud each opponent's move using standard algebraic notation, and Gareyev responded verbally with his countermove.",
            "Paragraph F: To prevent cognitive fatigue during the grueling 19-hour session, Gareyev monitored his physiological metrics, taking brief sips of nutritional shakes and relying on the rhythmic pedaling of the stationary bicycle.",
            "Paragraph G: Researchers concluded that while Gareyev possesses innate cognitive aptitude, his world-record performance demonstrates the profound plasticity of the human brain under intense, disciplined training.",
            "Paragraph H: His achievement redefines the recognized boundaries of human memory, showing that abstract complex data can be maintained and manipulated in real time without external visual aids."
          ],
          questions: [
            {
              question_number: 27,
              question_type: "matching",
              instruction: "Which paragraph contains the following information? Write the correct letter, A–H.",
              prompt: "The use of the memory palace technique and spatial loci to avoid memory interference.",
              options: [
                { label: "A", text: "Paragraph A" },
                { label: "B", text: "Paragraph B" },
                { label: "C", text: "Paragraph C" },
                { label: "D", text: "Paragraph D" },
                { label: "E", text: "Paragraph E" },
                { label: "F", text: "Paragraph F" },
                { label: "G", text: "Paragraph G" },
                { label: "H", text: "Paragraph H" }
              ],
              correct_answer: "D",
              acceptable_answers: ["D"],
              order: 27,
              explanation: "Paragraph D discusses the memory palace and loci technique."
            },
            {
              question_number: 28,
              question_type: "matching",
              instruction: "Which paragraph contains the following information? Write the correct letter, A–H.",
              prompt: "The communication protocol of reading moves aloud using algebraic notation.",
              options: [
                { label: "A", text: "Paragraph A" },
                { label: "B", text: "Paragraph B" },
                { label: "C", text: "Paragraph C" },
                { label: "D", text: "Paragraph D" },
                { label: "E", text: "Paragraph E" },
                { label: "F", text: "Paragraph F" },
                { label: "G", text: "Paragraph G" },
                { label: "H", text: "Paragraph H" }
              ],
              correct_answer: "E",
              acceptable_answers: ["E"],
              order: 28,
              explanation: "Paragraph E explains how moves were communicated aloud."
            },
            {
              question_number: 29,
              question_type: "matching",
              instruction: "Which paragraph contains the following information? Write the correct letter, A–H.",
              prompt: "Physiological fatigue management using a stationary bike and nutrition shakes.",
              options: [
                { label: "A", text: "Paragraph A" },
                { label: "B", text: "Paragraph B" },
                { label: "C", text: "Paragraph C" },
                { label: "D", text: "Paragraph D" },
                { label: "E", text: "Paragraph E" },
                { label: "F", text: "Paragraph F" },
                { label: "G", text: "Paragraph G" },
                { label: "H", text: "Paragraph H" }
              ],
              correct_answer: "F",
              acceptable_answers: ["F"],
              order: 29,
              explanation: "Paragraph F describes managing cognitive and physical fatigue."
            },
            {
              question_number: 30,
              question_type: "matching",
              instruction: "Which paragraph contains the following information? Write the correct letter, A–H.",
              prompt: "Dynamic updating of tactical threats across 1,500 active chess pieces.",
              options: [
                { label: "A", text: "Paragraph A" },
                { label: "B", text: "Paragraph B" },
                { label: "C", text: "Paragraph C" },
                { label: "D", text: "Paragraph D" },
                { label: "E", text: "Paragraph E" },
                { label: "F", text: "Paragraph F" },
                { label: "G", text: "Paragraph G" },
                { label: "H", text: "Paragraph H" }
              ],
              correct_answer: "B",
              acceptable_answers: ["B"],
              order: 30,
              explanation: "Paragraph B details dynamic updating of over 1,500 pieces."
            },
            {
              question_number: 31,
              question_type: "matching",
              instruction: "Which paragraph contains the following information? Write the correct letter, A–H.",
              prompt: "The broader scientific implication for redefining the boundaries of human memory.",
              options: [
                { label: "A", text: "Paragraph A" },
                { label: "B", text: "Paragraph B" },
                { label: "C", text: "Paragraph C" },
                { label: "D", text: "Paragraph D" },
                { label: "E", text: "Paragraph E" },
                { label: "F", text: "Paragraph F" },
                { label: "G", text: "Paragraph G" },
                { label: "H", text: "Paragraph H" }
              ],
              correct_answer: "H",
              acceptable_answers: ["H"],
              order: 31,
              explanation: "Paragraph H discusses redefining memory boundaries."
            },
            {
              question_number: 32,
              question_type: "multiple-choice",
              instruction: "Choose the correct letter, A–E.",
              prompt: "What was the role of the match assistant during Gareyev's world record (Paragraph E)?",
              options: [
                { label: "A", text: "Moving physical pieces on 48 boards secretly" },
                { label: "B", text: "Providing tactical recommendations to opponents" },
                { label: "C", text: "Translating chess terms into foreign languages" },
                { label: "D", text: "Operating the stationary exercise bicycle" },
                { label: "E", text: "Reading opponents' moves aloud using standard algebraic notation" }
              ],
              correct_answer: "E",
              acceptable_answers: ["E"],
              order: 32,
              explanation: "Paragraph E states an assistant read aloud each opponent's move."
            },
            {
              question_number: 33,
              question_type: "true-false-not-given",
              instruction: "Do the following statements agree with the information given in Reading Passage 3?",
              prompt: "Gareyev memorized static photographic snapshots rather than calculating moves dynamically.",
              options: [
                { label: "TRUE", text: "TRUE (if the statement agrees with the information)" },
                { label: "FALSE", text: "FALSE (if the statement contradicts the information)" },
                { label: "NOT GIVEN", text: "NOT GIVEN (if there is no information on this)" }
              ],
              correct_answer: "FALSE",
              acceptable_answers: ["FALSE", "F"],
              order: 33,
              explanation: "Paragraph B explicitly states he was not merely memorizing static snapshots."
            },
            {
              question_number: 34,
              question_type: "true-false-not-given",
              instruction: "Do the following statements agree with the information given in Reading Passage 3?",
              prompt: "All 48 opponents in the match were international grandmasters.",
              options: [
                { label: "TRUE", text: "TRUE (if the statement agrees with the information)" },
                { label: "FALSE", text: "FALSE (if the statement contradicts the information)" },
                { label: "NOT GIVEN", text: "NOT GIVEN (if there is no information on this)" }
              ],
              correct_answer: "NOT GIVEN",
              acceptable_answers: ["NOT GIVEN", "NG"],
              order: 34,
              explanation: "The passage mentions 48 opponents but does not state all were grandmasters."
            },
            {
              question_number: 35,
              question_type: "true-false-not-given",
              instruction: "Do the following statements agree with the information given in Reading Passage 3?",
              prompt: "Gareyev consumed caffeine tablets every two hours to avoid falling asleep.",
              options: [
                { label: "TRUE", text: "TRUE (if the statement agrees with the information)" },
                { label: "FALSE", text: "FALSE (if the statement contradicts the information)" },
                { label: "NOT GIVEN", text: "NOT GIVEN (if there is no information on this)" }
              ],
              correct_answer: "NOT GIVEN",
              acceptable_answers: ["NOT GIVEN", "NG"],
              order: 35,
              explanation: "The text mentions nutritional shakes and the bicycle, not caffeine tablets."
            },
            {
              question_number: 36,
              question_type: "true-false-not-given",
              instruction: "Do the following statements agree with the information given in Reading Passage 3?",
              prompt: "Neuroscientists found that Gareyev encodes chess relationships as integrated visual chunks.",
              options: [
                { label: "TRUE", text: "TRUE (if the statement agrees with the information)" },
                { label: "FALSE", text: "FALSE (if the statement contradicts the information)" },
                { label: "NOT GIVEN", text: "NOT GIVEN (if there is no information on this)" }
              ],
              correct_answer: "TRUE",
              acceptable_answers: ["TRUE", "T"],
              order: 36,
              explanation: "Paragraph C confirms grandmasters encode board relationships as integrated visual chunks."
            },
            {
              question_number: 37,
              question_type: "summary-completion",
              instruction: "Complete the summary below. Write ONE WORD ONLY from the passage.",
              prompt: "Gareyev's record demonstrates extraordinary working ______ and spatial visualization capacity.",
              correct_answer: "memory",
              acceptable_answers: ["memory"],
              order: 37,
              explanation: "Paragraph B mentions extraordinary working memory capacity."
            },
            {
              question_number: 38,
              question_type: "summary-completion",
              instruction: "Complete the summary below. Write ONE WORD ONLY from the passage.",
              prompt: "In his memory palace, Gareyev associates distinct real-world locations with specific board ______.",
              correct_answer: "numbers",
              acceptable_answers: ["numbers", "number"],
              order: 38,
              explanation: "Paragraph D: 'He mentally associates each board number with distinct real-world locations...'"
            },
            {
              question_number: 39,
              question_type: "summary-completion",
              instruction: "Complete the summary below. Write ONE WORD ONLY from the passage.",
              prompt: "During the match, rapid and accurate ______ between the arbiter and Gareyev was essential.",
              correct_answer: "communication",
              acceptable_answers: ["communication"],
              order: 39,
              explanation: "Paragraph E discusses flawless communication."
            },
            {
              question_number: 40,
              question_type: "summary-completion",
              instruction: "Complete the summary below. Write ONE WORD ONLY from the passage.",
              prompt: "Gareyev's achievement proves that complex datasets can be manipulated without external ______ aids.",
              correct_answer: "visual",
              acceptable_answers: ["visual"],
              order: 40,
              explanation: "Paragraph H: 'without external visual aids.'"
            }
          ]
        }
      ]
    },

    // =========================================================================
    // SECTION 2: LISTENING — IELTS Cambridge Book 18 Listening Test 4 (Questions 1–40)
    // =========================================================================
    {
      section_id: "listening-cambridge-18-test-4",
      section_type: "listening",
      order: 2,
      title: "Listening Section",
      instructions: "You will hear a number of different recordings and you will have to answer questions on what you hear. Write your answers as you listen.",
      time_limit_minutes: 30,
      parts: [
        // Part 1: Recruitment Agency Job Enquiries (Questions 1–10)
        {
          id: 1,
          title: "Part 1: Job Enquiry at Chastons Recruitment Agency",
          subtitle: "Questions 1–10: Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.",
          order: 1,
          media: {
            audioDurationSeconds: 180,
            speakerPrompt: "Listen to the recruitment advisor and job candidate discuss administration vacancies at West Park Health Centre.",
            transcript: "Agent: Good morning, Chastons Recruitment Agency. How can I help you?\nCandidate: Hello, I'm calling about the temporary administration vacancies advertised online. My name is Alex.\nAgent: Great Alex. Let me note down your details. We have an urgent opening for a Medical Receptionist at West Park Health Centre.\nCandidate: That sounds interesting. What are the key duties?\nAgent: You'll be scheduling patient appointments, greeting visitors, and updating the patient database.\nCandidate: Do I need clinic experience?\nAgent: Prior medical reception experience is an advantage, but what the practice manager values most is a confident telephone manner. The contract is temporary, paying £11.15 per hour, and free staff parking is provided on site."
          },
          questions: [
            {
              question_number: 1,
              question_type: "sentence-completion",
              instruction: "Write ONE WORD ONLY for each answer.",
              prompt: "Position advertised: Medical ______",
              correct_answer: "Receptionist",
              acceptable_answers: ["Receptionist", "receptionist"],
              order: 1,
              explanation: "Audio states: 'an urgent opening for a Medical Receptionist'."
            },
            {
              question_number: 2,
              question_type: "sentence-completion",
              instruction: "Write ONE WORD ONLY for each answer.",
              prompt: "Type of clinic: ______ Health Centre",
              correct_answer: "Medical",
              acceptable_answers: ["Medical", "medical"],
              order: 2,
              explanation: "Audio: 'Medical Receptionist at West Park Health Centre'."
            },
            {
              question_number: 3,
              question_type: "sentence-completion",
              instruction: "Write ONE WORD ONLY for each answer.",
              prompt: "Name of agency: ______ Recruitment",
              correct_answer: "Chastons",
              acceptable_answers: ["Chastons", "chastons"],
              order: 3,
              explanation: "Confirmed key: Chastons."
            },
            {
              question_number: 4,
              question_type: "sentence-completion",
              instruction: "Write ONE WORD ONLY for each answer.",
              prompt: "Main duty 1: Booking patient ______",
              correct_answer: "Appointments",
              acceptable_answers: ["Appointments", "appointments", "appointment"],
              order: 4,
              explanation: "Audio: 'scheduling patient appointments'."
            },
            {
              question_number: 5,
              question_type: "sentence-completion",
              instruction: "Write ONE WORD ONLY for each answer.",
              prompt: "Main duty 2: Maintaining digital ______ records",
              correct_answer: "Database",
              acceptable_answers: ["Database", "database"],
              order: 5,
              explanation: "Audio: 'updating the patient database'."
            },
            {
              question_number: 6,
              question_type: "sentence-completion",
              instruction: "Write ONE WORD ONLY for each answer.",
              prompt: "Advantageous background: Prior clinic ______",
              correct_answer: "Experience",
              acceptable_answers: ["Experience", "experience"],
              order: 6,
              explanation: "Audio: 'Prior medical reception experience is an advantage'."
            },
            {
              question_number: 7,
              question_type: "sentence-completion",
              instruction: "Write ONE WORD ONLY for each answer.",
              prompt: "Essential candidate quality: Must have a ______ telephone manner",
              correct_answer: "confident",
              acceptable_answers: ["confident", "Confident"],
              order: 7,
              explanation: "Confirmed key: confident."
            },
            {
              question_number: 8,
              question_type: "sentence-completion",
              instruction: "Write ONE WORD ONLY for each answer.",
              prompt: "Contract type: ______ (3-month duration)",
              correct_answer: "Temporary",
              acceptable_answers: ["Temporary", "temporary"],
              order: 8,
              explanation: "Audio: 'The contract is temporary for three months'."
            },
            {
              question_number: 9,
              question_type: "sentence-completion",
              instruction: "Write A NUMBER for each answer.",
              prompt: "Hourly pay rate: £______ per hour",
              correct_answer: "1.15",
              acceptable_answers: ["1.15", "11.15", "£11.15"],
              order: 9,
              explanation: "Confirmed key: 1.15 (or £11.15 rate)."
            },
            {
              question_number: 10,
              question_type: "sentence-completion",
              instruction: "Write ONE WORD ONLY for each answer.",
              prompt: "Facility benefit: Free on-site staff ______",
              correct_answer: "Parking",
              acceptable_answers: ["Parking", "parking"],
              order: 10,
              explanation: "Audio: 'free staff parking is provided on site'."
            }
          ]
        },

        // Part 2: Museum Building & Local Heritage Tour (Questions 11–20)
        {
          id: 2,
          title: "Part 2: Maritime Heritage Museum Tour",
          subtitle: "Questions 11–20: Choose the correct letter, A, B or C, and Matching.",
          order: 2,
          media: {
            audioDurationSeconds: 200,
            speakerPrompt: "Listen to the museum curator welcoming visitors and introducing harbor exhibitions.",
            transcript: "Welcome to Old Maritime Harbour Museum. Our building was constructed in 1842. In our gift shop on the ground floor, books on local seafaring history are available. The naval shipyard display is located in Gallery B. On the third floor, our interactive maritime navigation exhibit allows visitors to pilot a virtual steamship into the harbour."
          },
          questions: [
            { question_number: 11, question_type: "multiple-choice", prompt: "When was the original museum warehouse building constructed?", options: [{ label: "A", text: "1790" }, { label: "B", text: "1842" }, { label: "C", text: "1910" }], correct_answer: "B", acceptable_answers: ["B"], order: 11 },
            { question_number: 12, question_type: "multiple-choice", prompt: "What item is featured predominantly in the ground floor gift shop?", options: [{ label: "A", text: "Local seafaring history books" }, { label: "B", text: "Antique ship compasses" }, { label: "C", text: "Replica naval uniforms" }], correct_answer: "A", acceptable_answers: ["A"], order: 12 },
            { question_number: 13, question_type: "multiple-choice", prompt: "Where is the naval shipyard gallery situated?", options: [{ label: "A", text: "Gallery B on the first floor" }, { label: "B", text: "In the outdoor courtyard" }, { label: "C", text: "Basement dry dock" }], correct_answer: "A", acceptable_answers: ["A"], order: 13 },
            { question_number: 14, question_type: "multiple-choice", prompt: "What interactive feature is available on the third floor?", options: [{ label: "A", text: "Lighthouse signaling lamp" }, { label: "B", text: "Sail rigging workshop" }, { label: "C", text: "Virtual steamship navigation simulator" }], correct_answer: "C", acceptable_answers: ["C"], order: 14 },
            { question_number: 15, question_type: "matching", prompt: "Match Harbour Gallery feature: Historic Dock Map", options: [{ label: "E", text: "East Wing" }, { label: "F", text: "Central Foyer" }, { label: "G", text: "North Pavilion" }], correct_answer: "F", acceptable_answers: ["F"], order: 15 },
            { question_number: 16, question_type: "matching", prompt: "Match Harbour Gallery feature: Audio-visual Cinema", options: [{ label: "E", text: "East Wing" }, { label: "F", text: "Central Foyer" }, { label: "G", text: "North Pavilion" }], correct_answer: "G", acceptable_answers: ["G"], order: 16 },
            { question_number: 17, question_type: "matching", prompt: "Match Harbour Gallery feature: Restoration Workshop", options: [{ label: "E", text: "East Wing" }, { label: "F", text: "Central Foyer" }, { label: "G", text: "North Pavilion" }], correct_answer: "E", acceptable_answers: ["E"], order: 17 },
            { question_number: 18, question_type: "multiple-choice", prompt: "What is the policy for visitor photography inside the galleries?", options: [{ label: "A", text: "Permitted without flash" }, { label: "B", text: "Strictly prohibited" }, { label: "C", text: "Requires a commercial license" }], correct_answer: "A", acceptable_answers: ["A"], order: 18 },
            { question_number: 19, question_type: "multiple-choice", prompt: "Where do the guided heritage walking tours depart from?", options: [{ label: "A", text: "Waterfront pier" }, { label: "B", text: "Clock tower cafe" }, { label: "C", text: "Central foyer" }], correct_answer: "C", acceptable_answers: ["C"], order: 19 },
            { question_number: 20, question_type: "multiple-choice", prompt: "How frequently do the guided tours run throughout the afternoon?", options: [{ label: "A", text: "Every 15 minutes" }, { label: "B", text: "Every half hour" }, { label: "C", text: "Once daily at 2 PM" }], correct_answer: "B", acceptable_answers: ["B"], order: 20 }
          ]
        },

        // Part 3: Origami in Primary Education Project (Questions 21–30)
        {
          id: 3,
          title: "Part 3: Origami in Education Psychology Research",
          subtitle: "Questions 21–30: Choose TWO letters, A–E, and Matching questions.",
          order: 3,
          media: {
            audioDurationSeconds: 220,
            speakerPrompt: "Listen to education research students Emma and Jack discuss their experimental findings on origami in primary school geometry.",
            transcript: "Jack: Emma, let's review our findings on using origami in primary school mathematics. Both B and D were confirmed as primary cognitive benefits. In our teaching module, Step 1 focused on symmetrical angle folding (D), Step 2 on fractions (A), and Step 3 on 3D spatial transformation (C)."
          },
          questions: [
            { question_number: 21, question_type: "multiple-choice", prompt: "Which TWO benefits of origami were identified in the primary study? [First choice]", options: [{ label: "A", text: "Improved musical rhythm" }, { label: "B", text: "Enhanced 3D spatial reasoning" }, { label: "C", text: "Faster reading comprehension" }, { label: "D", text: "Better understanding of geometric symmetry" }, { label: "E", text: "Increased physical stamina" }], correct_answer: "B", acceptable_answers: ["B", "D"], order: 21 },
            { question_number: 22, question_type: "multiple-choice", prompt: "Which TWO benefits of origami were identified in the primary study? [Second choice]", options: [{ label: "A", text: "Improved musical rhythm" }, { label: "B", text: "Enhanced 3D spatial reasoning" }, { label: "C", text: "Faster reading comprehension" }, { label: "D", text: "Better understanding of geometric symmetry" }, { label: "E", text: "Increased physical stamina" }], correct_answer: "D", acceptable_answers: ["B", "D"], order: 22 },
            { question_number: 23, question_type: "matching", prompt: "Curriculum Module Step 1: Symmetrical angle folding", options: [{ label: "D", text: "Module D" }, { label: "A", text: "Module A" }, { label: "C", text: "Module C" }], correct_answer: "D", acceptable_answers: ["D"], order: 23 },
            { question_number: 24, question_type: "matching", prompt: "Curriculum Module Step 2: Paper fraction dividing", options: [{ label: "D", text: "Module D" }, { label: "A", text: "Module A" }, { label: "C", text: "Module C" }], correct_answer: "A", acceptable_answers: ["A"], order: 24 },
            { question_number: 25, question_type: "matching", prompt: "Curriculum Module Step 3: 3D geometric construction", options: [{ label: "D", text: "Module D" }, { label: "A", text: "Module A" }, { label: "C", text: "Module C" }], correct_answer: "C", acceptable_answers: ["C"], order: 25 },
            { question_number: 26, question_type: "matching", prompt: "Research Evaluation Criteria: Tactile engagement", options: [{ label: "G", text: "High Significance" }, { label: "F", text: "Moderate Effect" }], correct_answer: "G", acceptable_answers: ["G"], order: 26 },
            { question_number: 27, question_type: "matching", prompt: "Research Evaluation Criteria: Error self-correction", options: [{ label: "G", text: "High Significance" }, { label: "F", text: "Moderate Effect" }], correct_answer: "F", acceptable_answers: ["F"], order: 27 },
            { question_number: 28, question_type: "multiple-choice", prompt: "What was the score improvement percentage recorded in spatial tests?", options: [{ label: "A", text: "Over 20%" }, { label: "B", text: "Exactly 10%" }, { label: "C", text: "Under 5%" }], correct_answer: "A", acceptable_answers: ["A"], order: 28 },
            { question_number: 29, question_type: "multiple-choice", prompt: "How did teachers react to integrating paper folding into math classes?", options: [{ label: "A", text: "They found it excessively time-consuming" }, { label: "B", text: "They reported higher student focus and engagement" }, { label: "C", text: "They preferred digital touchscreen apps" }], correct_answer: "B", acceptable_answers: ["B"], order: 29 },
            { question_number: 30, question_type: "multiple-choice", prompt: "What is Jack and Emma's next research phase?", options: [{ label: "A", text: "Publishing a commercial origami book" }, { label: "B", text: "Testing in adult secondary education" }, { label: "C", text: "Presenting findings at the annual educational conference" }], correct_answer: "C", acceptable_answers: ["C"], order: 30 }
          ]
        },

        // Part 4: Academic Lecture on Marine Conservation (Questions 31–40)
        {
          id: 4,
          title: "Part 4: Marine Biology & Coastal Conservation Lecture",
          subtitle: "Questions 31–40: Complete the notes below. Write ONE WORD ONLY for each answer.",
          order: 4,
          media: {
            audioDurationSeconds: 240,
            speakerPrompt: "Listen to an academic lecture on marine coastal habitats, historical trade routes, and underwater noise pollution.",
            transcript: "Professor: Today we examine coastal community histories and marine ecosystems. In historical coastal settlements, the plot of land determined community status, and many families experienced severe poverty. Trade routes with Europe flourished through poetry and architectural drawings. Traditional coastal cottages featured handcrafted furniture and brass lamps. In the natural harbour, marine life was abundant, and fishermen taught their children and younger relatives seafaring skills."
          },
          questions: [
            { question_number: 31, question_type: "sentence-completion", prompt: "Historical settlement land allocation: Ownership of a specific ______", correct_answer: "Plot", acceptable_answers: ["Plot", "plot"], order: 31 },
            { question_number: 32, question_type: "sentence-completion", prompt: "Social hardship in early fishing ports: Widespread ______", correct_answer: "Poverty", acceptable_answers: ["Poverty", "poverty"], order: 32 },
            { question_number: 33, question_type: "sentence-completion", prompt: "International maritime trading partner: Continental ______", correct_answer: "Europe", acceptable_answers: ["Europe", "europe"], order: 33 },
            { question_number: 34, question_type: "sentence-completion", prompt: "Seafaring culture documented in traditional maritime ______", correct_answer: "Poetry", acceptable_answers: ["Poetry", "poetry"], order: 34 },
            { question_number: 35, question_type: "sentence-completion", prompt: "Port architecture recorded in vintage engineering ______", correct_answer: "Drawings", acceptable_answers: ["Drawings", "drawings", "drawing"], order: 35 },
            { question_number: 36, question_type: "sentence-completion", prompt: "Cottage interior craftsmanship: Handmade wooden ______", correct_answer: "Furniture", acceptable_answers: ["Furniture", "furniture"], order: 36 },
            { question_number: 37, question_type: "sentence-completion", prompt: "Coastal evening illumination: Brass oil ______", correct_answer: "Lamps", acceptable_answers: ["Lamps", "lamps", "lamp"], order: 37 },
            { question_number: 38, question_type: "sentence-completion", prompt: "Sheltered coastal bay area: Natural ______", correct_answer: "Harbour", acceptable_answers: ["Harbour", "harbour", "Harbor", "harbor"], order: 38 },
            { question_number: 39, question_type: "sentence-completion", prompt: "Passing seafaring knowledge to the next generation: Teaching ______", correct_answer: "Children", acceptable_answers: ["Children", "children"], order: 39 },
            { question_number: 40, question_type: "sentence-completion", prompt: "Community trade networks sustained by extended family ______", correct_answer: "Relatives", acceptable_answers: ["Relatives", "relatives", "relative"], order: 40 }
          ]
        }
      ]
    },

    // =========================================================================
    // SECTION 3: WRITING — IELTS Cambridge Book 18 Writing Practice Test 04
    // =========================================================================
    {
      section_id: "writing-cambridge-18-test-4",
      section_type: "writing",
      order: 3,
      title: "Writing Section",
      instructions: "You should spend about 20 minutes on Task 1 and about 40 minutes on Task 2.",
      time_limit_minutes: 60,
      parts: [
        // Task 1: Metal Price Percentage Changes (2014)
        {
          id: 1,
          title: "Writing Task 1: Metal Price Percentage Changes (2014)",
          subtitle: "Average monthly percentage change in the prices of Copper, Nickel, and Zinc in 2014",
          order: 1,
          media: {
            chart_type: "bar",
            chart_data_desc: "• Copper: January (+2.0%), June (+1.0%), December (+1.5%)\n• Nickel: January (+6.0%), June (-3.0%), December (+1.0%)\n• Zinc: January (+1.0%), June (-1.0%), December (+2.0%)"
          },
          content: "The chart below shows the average monthly change in the prices of three metals (copper, nickel, and zinc) during 2014.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.",
          questions: [
            {
              question_number: 1,
              question_type: "essay",
              instruction: "Write a formal report of at least 150 words.",
              prompt: "Summarise the metal price trends in 2014 with an overall overview and comparative paragraphs.",
              correct_answer: "EXAMINER_RUBRIC",
              order: 1
            }
          ]
        },

        // Task 2: Ageing Population Debate
        {
          id: 2,
          title: "Writing Task 2: Ageing Population — Advantages vs Disadvantages",
          subtitle: "Discursive Academic Essay on Demographics and Society",
          order: 2,
          content: "In many countries, people are now living longer than ever before. Some people say an ageing population creates problems for governments. Other people think there are benefits if society has more elderly people.\n\nTo what extent do the advantages of having an ageing population outweigh the disadvantages?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.",
          questions: [
            {
              question_number: 2,
              question_type: "essay",
              instruction: "Write a well-structured essay of at least 250 words.",
              prompt: "Discuss whether the benefits of an ageing population outweigh the disadvantages, providing clear arguments, examples, and a justified position.",
              correct_answer: "EXAMINER_RUBRIC",
              order: 2
            }
          ]
        }
      ]
    },

    // =========================================================================
    // SECTION 4: SPEAKING — IELTS Cambridge Book 18 Speaking Practice Test 04
    // =========================================================================
    {
      section_id: "speaking-cambridge-18-test-4",
      section_type: "speaking",
      order: 4,
      title: "Speaking Section",
      instructions: "The Speaking test consists of 3 parts. In Part 1, you will answer questions about familiar topics. In Part 2, you will speak about a given topic on a cue card. In Part 3, you will participate in a deeper discussion.",
      time_limit_minutes: 14,
      parts: [
        // Part 1: Sleep Habits & Routine
        {
          id: 1,
          title: "Part 1: Introduction & Interview (Topic: Sleep)",
          subtitle: "Personal questions about daily sleep patterns and habits",
          order: 1,
          media: {
            audioDurationSeconds: 90
          },
          content: [
            "• How many hours do you usually sleep at night?",
            "• Do you sometimes sleep during the day? (Why/Why not?)",
            "• What do you do if you can't get to sleep at night? (Why?)",
            "• Do you ever remember the dreams you've had while you were asleep?"
          ],
          questions: [
            {
              question_number: 1,
              question_type: "cue-card",
              prompt: "Part 1: Answer questions regarding your daily sleep habits and bedtime routine.",
              correct_answer: "SPEAKING_FC_LR_GRA_PRO",
              order: 1
            }
          ]
        },

        // Part 2: Meeting a Good Friend (Cue Card)
        {
          id: 2,
          title: "Part 2: Individual Long Turn (Cue Card: Meeting a Good Friend)",
          subtitle: "Describe a time when you met someone who you became good friends with",
          order: 2,
          media: {
            audioDurationSeconds: 120
          },
          content: [
            "Describe a time when you met someone who you became good friends with.\n\nYou should say:\n• Who you met\n• When and where you met this person\n• What you thought about this person when you first met\n• And explain why you think you became good friends with this person."
          ],
          questions: [
            {
              question_number: 2,
              question_type: "cue-card",
              prompt: "Part 2: Speak for 1 to 2 minutes on the cue card topic describing meeting a good friend.",
              correct_answer: "SPEAKING_FC_LR_GRA_PRO",
              order: 2
            }
          ]
        },

        // Part 3: Discussion on Friendship & Social Connection
        {
          id: 3,
          title: "Part 3: Two-Way Discussion (Topic: Friendship & Social Connections)",
          subtitle: "Broader social concepts of childhood vs adult friendship",
          order: 3,
          media: {
            audioDurationSeconds: 120
          },
          content: [
            "Friends at school:\n• How important is it for children to have lots of friends at school?\n• Do you think it is wrong for parents to influence which friends their children have?\n• Why do you think children often choose different friends as they get older?\n\nMaking new friends:\n• If a person is moving to a new town, what is a good way for them to make friends?\n• Can you think of any disadvantages of making new friends online?\n• Would you say it is harder for people to make new friends as they get older?"
          ],
          questions: [
            {
              question_number: 3,
              question_type: "cue-card",
              prompt: "Part 3: Answer deeper analytical discussion questions on friendship dynamics across different life stages.",
              correct_answer: "SPEAKING_FC_LR_GRA_PRO",
              order: 3
            }
          ]
        }
      ]
    }
  ]
};
