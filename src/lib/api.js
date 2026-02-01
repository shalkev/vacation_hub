import axios from 'axios';

// Local API endpoints
const VACATIONS_API = '/api/vacations';
const TEAM_API = '/api/team';

// ========== VACATIONS ==========

export const fetchVacations = async () => {
    try {
        const response = await axios.get(VACATIONS_API);
        return response.data;
    } catch (error) {
        console.error("Error fetching vacations:", error);
        return [];
    }
};

export const addVacation = async (data) => {
    try {
        const response = await axios.post(VACATIONS_API, {
            action: "ADD",
            ...data
        });
        return response.data;
    } catch (error) {
        console.error("Error adding vacation:", error);
        if (error.response?.data?.message) {
            return { success: false, message: error.response.data.message };
        }
        return { success: false, message: "Fehler bei der Verbindung zum Server." };
    }
};

export const updateVacation = async (id, start, end) => {
    try {
        const response = await axios.put(VACATIONS_API, { id, start, end });
        return response.data;
    } catch (error) {
        console.error("Error updating vacation:", error);
        if (error.response?.data?.message) {
            return { success: false, message: error.response.data.message };
        }
        return { success: false, message: "Fehler beim Aktualisieren." };
    }
};

export const deleteVacation = async (id, password) => {
    try {
        const response = await axios.post(VACATIONS_API, {
            action: "DELETE",
            id,
            password
        });
        return response.data;
    } catch (error) {
        console.error("Error deleting vacation:", error);
        if (error.response?.data?.message) {
            return { success: false, message: error.response.data.message };
        }
        return { success: false, message: "Fehler bei der Verbindung zum Server." };
    }
};

// ========== TEAM ==========

export const fetchTeam = async () => {
    try {
        const response = await axios.get(TEAM_API);
        return response.data;
    } catch (error) {
        console.error("Error fetching team:", error);
        return [];
    }
};

export const fetchTeamWithColors = async () => {
    try {
        const response = await axios.get(`${TEAM_API}?colors=true`);
        return response.data;
    } catch (error) {
        console.error("Error fetching team with colors:", error);
        return { team: [], availableColors: [] };
    }
};

export const addTeamMember = async (name, color) => {
    try {
        const response = await axios.post(TEAM_API, {
            action: "ADD",
            name,
            color
        });
        return response.data;
    } catch (error) {
        console.error("Error adding team member:", error);
        if (error.response?.data?.message) {
            return { success: false, message: error.response.data.message };
        }
        return { success: false, message: "Fehler beim Hinzufügen." };
    }
};

export const deleteTeamMember = async (id, password) => {
    try {
        const response = await axios.post(TEAM_API, {
            action: "DELETE",
            id,
            password
        });
        return response.data;
    } catch (error) {
        console.error("Error deleting team member:", error);
        if (error.response?.data?.message) {
            return { success: false, message: error.response.data.message };
        }
        return { success: false, message: "Fehler beim Löschen." };
    }
};

// ========== UTILITIES ==========

// Get color for a team member by name
export const getColorForMember = (team, name) => {
    const member = team.find(m => m.name === name);
    return member?.color || '#CCCCCC';
};
